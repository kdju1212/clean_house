"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwnedCompany, requireSession } from "@/lib/company-auth";
import { createNotification } from "@/lib/notification";

type ReservationStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "COMPLETED";

async function transitionStatus(
  formData: FormData,
  from: ReservationStatus,
  to: ReservationStatus
) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string") return;

  // Scoped to this company's own reservations and the expected current
  // status — a customer/other company can never touch this via a crafted id.
  const result = await prisma.reservation.updateMany({
    where: { id: reservationId, companyId: company.id, status: from },
    data: { status: to },
  });

  if (result.count > 0) {
    await notifyCustomer(reservationId, to, company.name);
  }

  revalidatePath("/company/reservations");
  revalidatePath(`/company/reservations/${reservationId}`);
}

async function notifyCustomer(
  reservationId: string,
  to: ReservationStatus,
  companyName: string
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { category: true },
  });
  if (!reservation) return;

  const detailLink = `/reservations/${reservation.id}`;

  if (to === "ACCEPTED") {
    await createNotification({
      userId: reservation.customerId,
      type: "RESERVATION_ACCEPTED",
      title: "예약이 승인됐어요",
      body: `${companyName}에서 ${reservation.category.name} 예약을 승인했어요.`,
      link: detailLink,
    });
  } else if (to === "REJECTED") {
    await createNotification({
      userId: reservation.customerId,
      type: "RESERVATION_REJECTED",
      title: "예약이 거절됐어요",
      body: `${companyName}에서 ${reservation.category.name} 예약을 거절했어요.`,
      link: detailLink,
    });
  } else if (to === "COMPLETED") {
    await createNotification({
      userId: reservation.customerId,
      type: "RESERVATION_COMPLETED",
      title: "청소가 완료됐어요",
      body: `${companyName}의 ${reservation.category.name} 서비스가 완료됐어요.`,
      link: detailLink,
    });
    await createNotification({
      userId: reservation.customerId,
      type: "REVIEW_REQUEST",
      title: "리뷰를 남겨주세요",
      body: `${companyName}에서의 경험은 어떠셨나요?`,
      link: `/reservations/${reservation.id}/review`,
    });
  }
}

export async function acceptReservation(formData: FormData) {
  await transitionStatus(formData, "REQUESTED", "ACCEPTED");
}

export async function rejectReservation(formData: FormData) {
  await transitionStatus(formData, "REQUESTED", "REJECTED");
}

export async function completeReservation(formData: FormData) {
  await transitionStatus(formData, "ACCEPTED", "COMPLETED");
}
