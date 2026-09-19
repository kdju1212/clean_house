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
      // parent included so the app can show "구 동" labels for the
      // company's existing picks without a second round trip.
      regions: { include: { region: { include: { parent: true } } } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!company) {
    return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 });
  }

  const [requestedCount, ratingSummary, legacyRegions] = await Promise.all([
    prisma.reservation.count({
      where: { companyId: company.id, status: "REQUESTED" },
    }),
    prisma.review.aggregate({
      where: { companyId: company.id },
      _avg: { rating: true },
      _count: true,
    }),
    // Small fixed set (predates the region hierarchy) — cheap enough to
    // always include here rather than a separate call from the app.
    prisma.region.findMany({
      where: { level: "EUPMYEONDONG", parentId: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
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
      categorySlug: s.category.slug,
      categoryName: s.category.name,
      price: s.price,
      pricingUnit: s.pricingUnit,
      description: s.description,
      supportedOptions: s.supportedOptions as Record<string, string[]> | null,
    })),
    regionIds: company.regions.map((r) => r.regionId),
    selectedRegions: company.regions.map((r) => ({
      id: r.region.id,
      label: r.region.parent ? `${r.region.parent.name} ${r.region.name}` : r.region.name,
    })),
    legacyRegions,
    photos: company.photos.map((p) => ({ id: p.id, url: p.url, type: p.type, categoryId: p.categoryId })),
  });
}
