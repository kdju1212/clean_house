import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the /company dashboard's data — includes services/
 * regions/photos too so the profile-edit screens can load everything in
 * one call, same as the web page's single Promise.all query. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: userId },
    include: {
      services: { include: { category: true }, orderBy: { createdAt: "asc" } },
      regions: { include: { region: true } },
      photos: { orderBy: { createdAt: "desc" } },
    },
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
      mainImageUrl: company.mainImageUrl,
    },
    requestedCount,
    averageRating: ratingSummary._avg.rating ?? 0,
    reviewCount: ratingSummary._count,
    services: company.services.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.category.name,
      price: s.price,
      description: s.description,
    })),
    regionIds: company.regions.map((r) => r.regionId),
    photos: company.photos.map((p) => ({ id: p.id, url: p.url, type: p.type })),
  });
}
