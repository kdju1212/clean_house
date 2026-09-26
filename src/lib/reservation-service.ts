import "server-only";
import { prisma } from "@/lib/prisma";
import { isClosedWeekday } from "@/lib/company-schedule-service";
import { TIME_SLOTS, blockedTimeSlots } from "@/lib/reservation";
import { getRegionAncestorIds } from "@/lib/region";
import { createNotification } from "@/lib/notification";
import { parseCategoryAnswers } from "@/lib/reservation-questions";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// A reservation still holds its time slot once accepted or even completed
// same-day (the crew really was there) — only a rejected/cancelled one
// frees it back up.
const HOLDS_TIME_SLOT_STATUSES = ["REQUESTED", "ACCEPTED", "COMPLETED", "NO_SHOW"] as const;

/**
 * Every time slot on `dateStr` that's unavailable for a NEW booking at this
 * company — already-booked times expanded by the company's own
 * reservationIntervalHours/crewCount. Shared by the create-time server check
 * and the client-facing "which times are open" endpoints (web/mobile), so a
 * customer never sees a time the server would then reject.
 */
export async function getBlockedTimesForDate(
  companyId: string,
  dateStr: string
): Promise<string[]> {
  const [company, existing] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { reservationIntervalHours: true, crewCount: true },
    }),
    prisma.reservation.findMany({
      where: {
        companyId,
        desiredDate: new Date(`${dateStr}T00:00:00.000Z`),
        status: { in: [...HOLDS_TIME_SLOT_STATUSES] },
      },
      select: { desiredTime: true },
    }),
  ]);
  if (!company) return [];
  return blockedTimeSlots(
    existing.map((r) => r.desiredTime),
    company.reservationIntervalHours,
    company.crewCount
  );
}

export type CreateReservationInput = {
  customerId: string;
  // Resolved region id for the customer — the web caller reads this from
  // the REGION_COOKIE, the mobile caller takes it directly from the
  // request body (no cookie there). Either way it must be re-verified here,
  // never trusted as already-checked by the caller.
  customerRegionId: string;
  companyId: unknown;
  // One entry per service booked on this visit — each with its own
  // category-specific quote details (e.g. 에어컨청소's 형태/대수), a plain
  // {key: value}-shaped object from the client that's re-validated below
  // against that category's actual question set before being stored.
  items: unknown;
  name: unknown;
  phone: unknown;
  address: unknown;
  addressDetail: unknown;
  desiredDateRaw: unknown;
  desiredTime: unknown;
  requestNote: unknown;
};

const MAX_ITEMS = 10;

/**
 * Core reservation-creation logic shared by the web Server Action
 * (src/app/reservations/actions.ts) and the mobile API route
 * (src/app/api/mobile/reservations/route.ts) — same field validation, same
 * "never trust the client's company/category/region" re-verification, same
 * notification. Callers differ only in how they parse the raw request
 * (FormData vs JSON body) and how they report success/failure back.
 */
export async function createReservationForCustomer(
  input: CreateReservationInput
): Promise<string> {
  const {
    customerId,
    customerRegionId,
    companyId,
    items,
    name,
    phone,
    address,
    addressDetail,
    desiredDateRaw,
    desiredTime,
    requestNote,
  } = input;

  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("업체 정보가 올바르지 않습니다.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("청소 종류를 선택해주세요.");
  }
  if (items.length > MAX_ITEMS) {
    throw new Error("한 번에 예약할 수 있는 서비스 수를 넘었어요.");
  }
  const requested = items.map((item) => {
    const { categoryId, categoryAnswers } = (item ?? {}) as Record<string, unknown>;
    if (typeof categoryId !== "string" || categoryId.length === 0) {
      throw new Error("청소 종류를 선택해주세요.");
    }
    return { categoryId, categoryAnswers };
  });
  const categoryIds = requested.map((r) => r.categoryId);
  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new Error("같은 서비스를 중복으로 선택했어요.");
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("이름을 입력해주세요.");
  }
  if (typeof phone !== "string" || phone.replace(/[^0-9]/g, "").length < 9) {
    throw new Error("올바른 연락처를 입력해주세요.");
  }
  if (typeof address !== "string" || address.trim().length === 0) {
    throw new Error("서비스 주소를 입력해주세요.");
  }
  if (typeof desiredTime !== "string" || !TIME_SLOTS.includes(desiredTime)) {
    throw new Error("희망 시간을 선택해주세요.");
  }
  if (typeof desiredDateRaw !== "string") {
    throw new Error("희망 날짜를 선택해주세요.");
  }
  const desiredDate = new Date(`${desiredDateRaw}T00:00:00`);
  if (Number.isNaN(desiredDate.getTime()) || desiredDate < startOfToday()) {
    throw new Error("오늘 이후 날짜를 선택해주세요.");
  }

  // Never trust that the company/category combo the client posted is real —
  // re-derive it and make sure the company is actually bookable right now.
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      services: { where: { categoryId: { in: categoryIds } }, include: { category: true } },
      regions: true,
    },
  });
  if (!company || company.status !== "ACTIVE" || !company.isAvailable) {
    throw new Error("현재 예약을 받을 수 없는 업체입니다.");
  }
  if (company.services.length !== categoryIds.length) {
    throw new Error("해당 업체가 제공하지 않는 서비스가 포함돼 있어요.");
  }

  // The client-side date input only shows a hint for blocked dates (see
  // src/app/company/schedule) — the server is the actual source of truth,
  // same reasoning as every other "never trust the client" check here.
  const isBlocked = await prisma.companyBlockedDate.findUnique({
    where: { companyId_date: { companyId: company.id, date: desiredDate } },
  });
  if (isBlocked || isClosedWeekday(new Date(`${desiredDateRaw}T00:00:00.000Z`), company.closedWeekdays)) {
    throw new Error("해당 날짜는 업체 휴무일이에요. 다른 날짜를 선택해주세요.");
  }

  // The client-side time select only disables slots it already knows are
  // blocked (see the blocked-times endpoints) — re-check here regardless,
  // since two customers can race to book the same opening.
  const blockedTimes = await getBlockedTimesForDate(company.id, desiredDateRaw);
  if (blockedTimes.includes(desiredTime)) {
    throw new Error("이미 예약이 있는 시간이에요. 다른 시간을 선택해주세요.");
  }

  const parsedItems = requested.map(({ categoryId, categoryAnswers }, order) => {
    const service = company.services.find((s) => s.categoryId === categoryId)!;
    let answers: Record<string, string> | null;
    try {
      answers = parseCategoryAnswers(
        service.category.slug,
        typeof categoryAnswers === "object" && categoryAnswers !== null
          ? (categoryAnswers as Record<string, unknown>)
          : {}
      );
    } catch (err) {
      // With several services on one form, "평수 항목을 입력해주세요" alone
      // doesn't say which service's section it's in.
      throw new Error(`[${service.category.name}] ${(err as Error).message}`);
    }
    return { service, answers, order };
  });

  // Re-verify region eligibility server-side too — the UI only shows
  // companies that service the customer's selected region, but a direct API
  // call could name any companyId, so redo that check independently here.
  const ancestorRegionIds = await getRegionAncestorIds(customerRegionId);
  const servicesCustomerRegion = company.regions.some((r) =>
    ancestorRegionIds.includes(r.regionId)
  );
  if (!servicesCustomerRegion) {
    throw new Error("해당 업체는 고객님의 지역을 서비스하지 않습니다.");
  }

  const reservation = await prisma.reservation.create({
    data: {
      customerId,
      companyId: company.id,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      address: address.trim(),
      addressDetail:
        typeof addressDetail === "string" && addressDetail.trim().length > 0
          ? addressDetail.trim()
          : null,
      desiredDate,
      desiredTime,
      requestNote:
        typeof requestNote === "string" && requestNote.trim().length > 0
          ? requestNote.trim().slice(0, 1000)
          : null,
      // Snapshot the prices at booking time — the company's prices can
      // change later, but this reservation should keep showing what was
      // agreed.
      price: parsedItems.reduce((sum, { service }) => sum + service.price, 0),
      items: {
        create: parsedItems.map(({ service, answers, order }) => ({
          categoryId: service.categoryId,
          categoryAnswers: answers ?? undefined,
          price: service.price,
          order,
        })),
      },
      chatRoom: { create: {} },
    },
  });

  await createNotification({
    userId: company.ownerUserId,
    type: "RESERVATION_REQUESTED",
    title: "새 예약 요청이 들어왔어요",
    body: `${name.trim()}님이 ${parsedItems.map(({ service }) => service.category.name).join(" · ")} 예약을 신청했어요.`,
    link: `/company/reservations/${reservation.id}`,
  });

  return reservation.id;
}
