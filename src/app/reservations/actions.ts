"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIME_SLOTS } from "@/lib/reservation";
import { createNotification } from "@/lib/notification";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function createReservation(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("로그인이 필요합니다.");
  }

  const companyId = formData.get("companyId");
  const categoryId = formData.get("categoryId");
  const name = formData.get("name");
  const phone = formData.get("phone");
  const address = formData.get("address");
  const addressDetail = formData.get("addressDetail");
  const desiredDateRaw = formData.get("desiredDate");
  const desiredTime = formData.get("desiredTime");
  const requestNote = formData.get("requestNote");

  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("업체 정보가 올바르지 않습니다.");
  }
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    throw new Error("청소 종류를 선택해주세요.");
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
    include: { services: { where: { categoryId }, include: { category: true } } },
  });
  if (!company || company.status !== "ACTIVE" || !company.isAvailable) {
    throw new Error("현재 예약을 받을 수 없는 업체입니다.");
  }
  if (company.services.length === 0) {
    throw new Error("해당 업체가 제공하지 않는 서비스입니다.");
  }

  const reservation = await prisma.reservation.create({
    data: {
      customerId: session.user.id,
      companyId: company.id,
      categoryId,
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
      // Snapshot the price at booking time — the company's price can change
      // later, but this reservation should keep showing what was agreed.
      price: company.services[0].price,
      chatRoom: { create: {} },
    },
  });

  await createNotification({
    userId: company.ownerUserId,
    type: "RESERVATION_REQUESTED",
    title: "새 예약 요청이 들어왔어요",
    body: `${name.trim()}님이 ${company.services[0].category.name} 예약을 신청했어요.`,
    link: `/company/reservations/${reservation.id}`,
  });

  redirect(`/reservations?created=${reservation.id}`);
}

export async function cancelReservation(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("로그인이 필요합니다.");
  }

  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string") return;

  // Scoped to the caller's own reservation and only from a cancellable
  // state — an already-completed/rejected/cancelled booking can't change.
  const result = await prisma.reservation.updateMany({
    where: {
      id: reservationId,
      customerId: session.user.id,
      status: { in: ["REQUESTED", "ACCEPTED"] },
    },
    data: { status: "CANCELLED" },
  });

  if (result.count > 0) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { company: true, category: true },
    });
    if (reservation) {
      await createNotification({
        userId: reservation.company.ownerUserId,
        type: "RESERVATION_CANCELLED",
        title: "예약이 취소됐어요",
        body: `${reservation.customerName}님이 ${reservation.category.name} 예약을 취소했어요.`,
        link: `/company/reservations/${reservation.id}`,
      });
    }
  }

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
}
