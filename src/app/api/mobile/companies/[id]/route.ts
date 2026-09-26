import { NextResponse } from "next/server";
import { customerBlockedDates } from "@/lib/company-schedule-service";
import { generateTimeSlots } from "@/lib/reservation";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";

/**
 * Mobile equivalent of the web /companies/[id] detail page — the app had no
 * customer-facing detail screen at all (category list went straight to the
 * reservation form), so this mirrors that page's data: photos, services,
 * regions, reviews, and whether the caller has favorited it. Optional auth
 * (getMobileUserId returns null rather than throwing) since anyone can view
 * a company, but only a logged-in customer has a favorite state to report.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const todayStr = new Date().toISOString().slice(0, 10);

  const [company, reviews, ratingSummary, userId] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        services: { include: { category: true }, orderBy: { createdAt: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
        regions: { include: { region: true } },
        blockedDates: {
          where: { date: { gte: new Date(`${todayStr}T00:00:00`) } },
          orderBy: { date: "asc" },
        },
      },
    }),
    prisma.review.findMany({
      where: { companyId: id, hidden: false },
      include: { customer: true, photos: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { companyId: id, hidden: false },
      _avg: { rating: true },
      _count: true,
    }),
    getMobileUserId(request),
  ]);

  if (!company || company.status !== "ACTIVE") {
    return NextResponse.json({ error: "존재하지 않는 업체입니다." }, { status: 404 });
  }

  const isFavorited = userId
    ? !!(await prisma.favorite.findUnique({
        where: { customerId_companyId: { customerId: userId, companyId: id } },
      }))
    : false;

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      phone: company.phone,
      introText: company.introText,
      businessHours: company.businessHours,
      isAvailable: company.isAvailable,
      isVerified: company.isVerified,
      hasBusinessRegistration: Boolean(company.businessRegistrationNumber),
      mainImageUrl: company.mainImageUrl,
      websiteUrl: company.websiteUrl,
      detailPageMode: company.detailPageMode,
    },
    services: company.services.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      categorySlug: s.category.slug,
      categoryName: s.category.name,
      price: s.price,
      pricingUnit: s.pricingUnit,
      description: s.description,
    })),
    photos: company.photos.map((p) => ({
      id: p.id,
      url: p.url,
      type: p.type,
      categoryId: p.categoryId,
      caption: p.caption,
    })),
    blockedDates: customerBlockedDates(
      company.blockedDates.map((b) => b.date),
      company.closedWeekdays
    ),
    timeSlots: generateTimeSlots(company.businessHours, company.reservationIntervalHours),
    regionNames: company.regions.map((r) => r.region.name),
    averageRating: ratingSummary._avg.rating ?? 0,
    reviewCount: ratingSummary._count,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      photoUrls: r.photos.length > 0 ? r.photos.map((p) => p.url) : r.photoUrl ? [r.photoUrl] : [],
      customerName: r.customer.name ?? "익명",
      createdAt: r.createdAt.toISOString(),
    })),
    isFavorited,
  });
}
