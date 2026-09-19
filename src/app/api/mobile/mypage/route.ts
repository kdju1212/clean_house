import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the web /mypage page's data — one call for the
 * profile summary, reservation status counts, own reviews, and favorites. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [user, statusCounts, reviews, favorites] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { accounts: true },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      where: { customerId: userId },
      _count: true,
    }),
    prisma.review.findMany({
      where: { customerId: userId },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.favorite.findMany({
      where: { customerId: userId },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalReservations = statusCounts.reduce((sum, s) => sum + s._count, 0);

  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      loginProvider: user.accounts[0]?.provider ?? null,
    },
    reservationCounts: {
      total: totalReservations,
      requested: countByStatus.get("REQUESTED") ?? 0,
      accepted: countByStatus.get("ACCEPTED") ?? 0,
      completed: countByStatus.get("COMPLETED") ?? 0,
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.company.name,
      rating: r.rating,
      content: r.content,
    })),
    favorites: favorites.map((f) => ({
      companyId: f.companyId,
      companyName: f.company.name,
      mainImageUrl: f.company.mainImageUrl,
    })),
  });
}
