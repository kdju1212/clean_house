"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwnedCompany } from "@/lib/company-auth";
import { AD_SLOT_PRICE, AD_SLOTS, startOfToday } from "@/lib/ad";

export async function applyAd(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  if (company.status !== "ACTIVE") {
    throw new Error("승인된 업체만 광고를 신청할 수 있어요.");
  }

  const categoryId = formData.get("categoryId");
  const slotRaw = formData.get("slot");
  const startDateRaw = formData.get("startDate");
  const endDateRaw = formData.get("endDate");

  if (typeof categoryId !== "string" || categoryId.length === 0) {
    throw new Error("청소 종류를 선택해주세요.");
  }
  const slot = Number(slotRaw);
  if (!(AD_SLOTS as readonly number[]).includes(slot)) {
    throw new Error("올바른 광고 슬롯을 선택해주세요.");
  }
  if (typeof startDateRaw !== "string" || typeof endDateRaw !== "string") {
    throw new Error("광고 기간을 선택해주세요.");
  }
  const startDate = new Date(`${startDateRaw}T00:00:00`);
  const endDate = new Date(`${endDateRaw}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("광고 기간을 올바르게 선택해주세요.");
  }
  if (startDate < startOfToday()) {
    throw new Error("시작일은 오늘 이후여야 해요.");
  }
  if (endDate < startDate) {
    throw new Error("종료일은 시작일 이후여야 해요.");
  }

  // Never trust the client's category/slot — re-derive that the company
  // actually offers this category before letting it advertise there.
  const service = await prisma.companyService.findUnique({
    where: { companyId_categoryId: { companyId: company.id, categoryId } },
  });
  if (!service) {
    throw new Error("해당 업체가 제공하지 않는 서비스예요.");
  }

  // A slot is exclusive per category for any given day — reject if the
  // requested range overlaps an existing non-cancelled booking on it.
  const overlapping = await prisma.advertisement.findFirst({
    where: {
      categoryId,
      slot,
      cancelled: false,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlapping) {
    throw new Error(
      "해당 기간에는 이미 예약된 슬롯이에요. 다른 기간이나 슬롯을 선택해주세요."
    );
  }

  await prisma.advertisement.create({
    data: {
      companyId: company.id,
      categoryId,
      slot,
      startDate,
      endDate,
      // Snapshot today's slot price — a later price change shouldn't alter
      // an already-booked ad's price.
      pricePerDay: AD_SLOT_PRICE[slot],
    },
  });

  revalidatePath("/company/ads");
}

export async function cancelAd(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const adId = formData.get("adId");
  if (typeof adId !== "string" || adId.length === 0) return;

  // Scoped to this company's own, not-already-cancelled, not-yet-ended ad —
  // a run that already finished can't be retroactively cancelled.
  await prisma.advertisement.updateMany({
    where: {
      id: adId,
      companyId: company.id,
      cancelled: false,
      endDate: { gte: startOfToday() },
    },
    data: { cancelled: true },
  });

  revalidatePath("/company/ads");
}
