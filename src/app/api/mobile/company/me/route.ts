import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the /company dashboard's header/summary data — the
 * app's own screens for editing services/regions/photos come later, so
 * this stays read-only for now. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: userId },
  });
  if (!company) {
    return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 });
  }

  const [requestedCount, ratingSummary] = await Promise.all([
    prisma.reservation.count({
      where: { companyId: company.id, status: "REQUESTED" },
    }),
    prisma.review.aggregate({
      where: { companyId: company.id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      status: company.status,
      isAvailable: company.isAvailable,
      phone: company.phone,
      introText: company.introText,
      businessHours: company.businessHours,
    },
    requestedCount,
    averageRating: ratingSummary._avg.rating ?? 0,
    reviewCount: ratingSummary._count,
  });
}
