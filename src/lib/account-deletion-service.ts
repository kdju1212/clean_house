import "server-only";
import { prisma } from "@/lib/prisma";
import { RESERVATION_ITEMS_INCLUDE, reservationServiceNames } from "@/lib/reservation";
import { createNotification } from "@/lib/notification";

/**
 * 회원 탈퇴. Never hard-deletes the User row — every FK to it (Reservation,
 * Review, ChatMessage, and Company via ownerUserId) cascades in the schema,
 * so deleting it outright would also destroy other people's legitimate
 * records (a company's reservation history, a customer's own review
 * thread). Instead this anonymizes the row and marks it deletedAt, exactly
 * the same "soft" shape admin suspension already uses for a Company.
 *
 * Shared by the web mypage Server Action and the mobile account API route.
 */
export async function deleteAccountForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user || user.deletedAt) return;

  // A still-active company keeps its own row (its reservations/reviews are
  // other customers' records too) but stops taking new business — same
  // suspended shape admin-initiated suspension uses, see
  // admin-company-service.ts's suspendCompanyForAdmin.
  if (user.company && user.company.status !== "SUSPENDED") {
    await prisma.company.update({
      where: { id: user.company.id },
      data: { status: "SUSPENDED", suspendedReason: "회원 탈퇴로 더 이상 예약을 받지 않는 업체예요." },
    });
  }

  // Any of this person's own still-open bookings (as a customer) need to
  // not just quietly vanish on the company side — cancel them and let the
  // company know, bypassing the normal day-of/day-before cutoff since the
  // account is gone regardless of how close the visit is.
  const openReservations = await prisma.reservation.findMany({
    where: { customerId: userId, status: { in: ["REQUESTED", "ACCEPTED"] } },
    include: { company: true, items: RESERVATION_ITEMS_INCLUDE },
  });
  if (openReservations.length > 0) {
    await prisma.reservation.updateMany({
      where: { id: { in: openReservations.map((r) => r.id) } },
      data: { status: "CANCELLED" },
    });
    for (const reservation of openReservations) {
      await createNotification({
        userId: reservation.company.ownerUserId,
        type: "RESERVATION_CANCELLED",
        title: "예약이 취소됐어요",
        body: `${reservation.customerName}님이 회원 탈퇴로 ${reservationServiceNames(reservation.items)} 예약이 취소됐어요.`,
        link: `/company/reservations/${reservation.id}`,
      });
    }
  }

  // Purely personal preference data with no other party's interest in it —
  // unlike reservations/reviews, safe to actually delete.
  await prisma.favorite.deleteMany({ where: { customerId: userId } });
  await prisma.categoryProfile.deleteMany({ where: { customerId: userId } });

  // Drops the OAuth links so the same Google/Kakao/Naver identity can sign
  // up fresh afterward instead of finding a "used" account.
  await prisma.account.deleteMany({ where: { userId } });

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "탈퇴한 회원",
      email: null,
      image: null,
      phone: null,
      pushToken: null,
      deletedAt: new Date(),
    },
  });
}
