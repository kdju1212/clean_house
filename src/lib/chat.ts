import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * A chat room is only visible to the two parties tied to its reservation —
 * the customer who booked, and the owner of the company being booked.
 * Returns null (never throws) so callers can turn it into a clean 403/404.
 */
export async function requireChatAccess(reservationId: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { company: true, chatRoom: true, category: true },
  });

  if (!reservation || !reservation.chatRoom) {
    return null;
  }

  const isCustomer = reservation.customerId === userId;
  const isCompanyOwner = reservation.company.ownerUserId === userId;

  if (!isCustomer && !isCompanyOwner) {
    return null;
  }

  return {
    reservation,
    chatRoomId: reservation.chatRoom.id,
    isCustomer,
  };
}
