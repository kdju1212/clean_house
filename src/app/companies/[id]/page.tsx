import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPricingQuantityKey, PRICING_UNIT_LABEL } from "@/lib/reservation-questions";
import { SubmitButton } from "@/components/submit-button";
import { toggleFavorite } from "./actions";
import { Gallery } from "./gallery";
import { CompanyDetailDynamic } from "./company-detail-dynamic";
import { InfoRows } from "@/components/company-detail/info-rows";
import { RatingDistribution } from "@/components/company-detail/rating-distribution";
import { ReviewCard, ReviewPhotoStrip } from "@/components/company-detail/review-list";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import Link from "next/link";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // Set by the category listing's link so arriving from a specific
  // category (e.g. 에어컨청소) pre-selects that service instead of showing
  // the company's general intro/photos — see CompanyDetailDynamic.
  searchParams: Promise<{ categoryId?: string }>;
}) {
  const { id } = await params;
  const { categoryId: initialCategoryId } = await searchParams;

  const [session, company, reviews, ratingSummary, ratingGroups] = await Promise.all([
    auth(),
    prisma.company.findUnique({
      where: { id },
      include: {
        services: { include: { category: true }, orderBy: { createdAt: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
        regions: { include: { region: true } },
      },
    }),
    prisma.review.findMany({
      where: { companyId: id, hidden: false },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { companyId: id, hidden: false },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { companyId: id, hidden: false },
      _count: true,
    }),
  ]);

  if (!company || company.status !== "ACTIVE") {
    notFound();
  }

  const isFavorited = session?.user
    ? !!(await prisma.favorite.findUnique({
        where: { customerId_companyId: { customerId: session.user.id, companyId: id } },
      }))
    : false;

  const averageRating = ratingSummary._avg.rating ?? 0;
  const reviewCount = ratingSummary._count;
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => ratingGroups.find((g) => g.rating === star)?._count ?? 0
  );

  const galleryPhotos = company.mainImageUrl
    ? [
        { id: "main", url: company.mainImageUrl },
        ...company.photos.filter((p) => p.url !== company.mainImageUrl),
      ]
    : company.photos.map((p) => ({ id: p.id, url: p.url }));

  const workPhotos = company.photos.filter((p) => p.type === "WORK");
  const beforeAfterPhotos = company.photos.filter((p) => p.type === "BEFORE_AFTER");
  const services = company.services.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    categoryName: s.category.name,
    price: s.price,
    pricingUnit: s.pricingUnit,
    unitLabel: PRICING_UNIT_LABEL[getPricingQuantityKey(s.category.slug) ?? ""] ?? null,
    description: s.description,
  }));
  const reviewItems = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    createdAt: r.createdAt,
    customerName: r.customer.name ?? "익명",
    content: r.content,
    photoUrl: r.photoUrl,
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 pb-28">
      <Gallery photos={galleryPhotos} alt={company.name} />

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="min-w-0 truncate text-xl font-bold">{company.name}</h1>
            {company.isVerified ? (
              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                인증
              </span>
            ) : (
              company.businessRegistrationNumber && (
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500">
                  사업자등록
                </span>
              )
            )}
          </div>
          {session?.user ? (
            <form action={toggleFavorite}>
              <input type="hidden" name="companyId" value={company.id} />
              <SubmitButton
                aria-label={isFavorited ? "찜 해제" : "찜하기"}
                className="text-2xl leading-none"
              >
                {isFavorited ? "♥" : "♡"}
              </SubmitButton>
            </form>
          ) : (
            <Link
              href="/login"
              aria-label="찜하려면 로그인"
              className="text-2xl leading-none text-neutral-300"
            >
              ♡
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {reviewCount > 0 ? (
            <>
              <span className="font-semibold text-amber-500">★ {averageRating.toFixed(1)}</span>{" "}
              리뷰 {reviewCount}개
            </>
          ) : (
            "아직 리뷰가 없어요"
          )}
        </p>
        <CompanyDetailDynamic
          companyId={company.id}
          services={services}
          companyIntroText={company.introText}
          workPhotos={workPhotos}
          beforeAfterPhotos={beforeAfterPhotos}
          initialCategoryId={initialCategoryId ?? null}
        />

        <InfoRows
          rows={[
            { label: "서비스 지역", value: company.regions.map((r) => r.region.name).join(", ") || "-" },
            { label: "영업시간", value: company.businessHours ?? "-" },
            { label: "예약 가능 여부", value: company.isAvailable ? "예약 가능" : "예약 마감" },
            ...(company.phone ? [{ label: "연락처", value: company.phone }] : []),
          ]}
        />

        <section className="mt-5">
          <h2 className="text-sm font-semibold">
            리뷰 {reviewCount > 0 ? `(${reviewCount})` : ""}
          </h2>
          <RatingDistribution
            averageRating={averageRating}
            reviewCount={reviewCount}
            counts={ratingCounts}
          />
          <ReviewPhotoStrip reviews={reviewItems} />
          {reviewItems.length > 0 && (
            <ul className="mt-3 flex flex-col gap-3">
              {reviewItems.map((review) => (
                <ReviewCard key={review.id} review={review} reportHref={`/reviews/${review.id}/report`} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <ScrollToTopButton />
    </main>
  );
}
