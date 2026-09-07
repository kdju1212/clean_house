import "server-only";
import { prisma } from "@/lib/prisma";

/** A review can only be written by the reservation's own customer, once the
 * cleaning is COMPLETED, and only once per reservation. Returns null (never
 * throws) so callers can turn it into a clean redirect/404. */
export async function requireReviewableReservation(
  reservationId: string,
  userId: string
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { review: true },
  });

  if (
    !reservation ||
    reservation.customerId !== userId ||
    reservation.status !== "COMPLETED" ||
    reservation.review
  ) {
    return null;
  }

  return reservation;
}
