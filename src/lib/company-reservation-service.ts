import "server-only";
import { prisma } from "@/lib/prisma";
import { requireOwnedCompany } from "@/lib/company-auth";
import { createNotification } from "@/lib/notification";

type ReservationStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "COMPLETED";

/**
 * Shared by the web company/reservations Server Actions and the mobile
 * company API — same ownership check (re-derives the caller's company from
 * their own userId, never trusts a companyId from the client) and same
 * from-status guard (updateMany's where clause only matches if the
 * reservation is still in the expected state, so a stale/duplicate request
 * is a silent no-op rather than a double-transition).
 */
export async function transitionReservationForOwner(
  ownerUserId: string,
  reservationId: string,
  from: ReservationStatus,
  to: ReservationStatus
): Promise<{ updated: boolean }> {
  const company = await requireOwnedCompany(ownerUserId);

  const result = await prisma.reservation.updateMany({
    where: { id: reservationId, companyId: company.id, status: from },
    data: { status: to },
  });

  if (result.count > 0) {
    await notifyCustomer(reservationId, to, company.name);
  }

  return { updated: result.count > 0 };
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
