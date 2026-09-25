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
import { BackButton } from "@/components/company-detail/back-button";
import { ChevronRightIcon, HeartIcon } from "@/components/icons";
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
      include: { customer: true, photos: { orderBy: { order: "asc" } } },
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

  // Just the current main image — work/전후 photos already get their own
  // sections further down (PhotoStack), so the hero no longer needs to
  // double as a full gallery with a thumbnail strip.
  const galleryPhotos = company.mainImageUrl
    ? [{ id: "main", url: company.mainImageUrl }]
    : [];

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
    photoUrls:
      r.photos.length > 0 ? r.photos.map((p) => p.url) : r.photoUrl ? [r.photoUrl] : [],
  }));

  const regionText = company.regions.map((r) => r.region.name).join(", ");
  const roundedStars = Math.round(averageRating);
  const hasDetailPhotos = workPhotos.length > 0 || beforeAfterPhotos.length > 0;

  return (
    <main className="mx-auto w-full max-w-md flex-1 pb-28">
      <div className="relative">
        <Gallery photos={galleryPhotos} alt={company.name} />
        <div className="absolute left-3 top-3 z-[1]">
          <BackButton />
        </div>
        <div className="absolute bottom-3 right-3 z-[1] flex flex-col items-end gap-2">
          {session?.user ? (
            <form action={toggleFavorite}>
              <input type="hidden" name="companyId" value={company.id} />
              <SubmitButton
                aria-label={isFavorited ? "찜 해제" : "찜하기"}
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md ${
                  isFavorited ? "text-[#e52528]" : "text-neutral-900"
                }`}
              >
                <HeartIcon filled={isFavorited} className="h-7 w-7" />
              </SubmitButton>
            </form>
          ) : (
            <Link
              href="/login"
              aria-label="찜하려면 로그인"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md"
            >
              <HeartIcon className="h-7 w-7" />
            </Link>
          )}
          {hasDetailPhotos && (
            <a
              href="#detail"
              className="flex items-center rounded-full bg-white py-2 pl-4 pr-2.5 text-[15px] font-bold text-neutral-900 shadow-md"
            >
              상세정보
              <ChevronRightIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="pt-1 text-[15px] font-bold text-neutral-900">
            {company.isVerified ? (
              <>
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#18a058] text-[11px] text-white">
                  ✓
                </span>
                관리자가 <span className="text-[#ff6f0f]">인증</span>한 업체예요
              </>
            ) : company.businessRegistrationNumber ? (
              "사업자등록을 마친 업체예요"
            ) : null}
          </p>
          <Link href={`/companies/${id}/reviews`} className="shrink-0 text-right">
            {reviewCount > 0 ? (
              <>
                <span className="block text-[22px] leading-none tracking-tight">
                  <span className="text-[#ff9600]">{"★".repeat(roundedStars)}</span>
                  <span className="text-neutral-300">{"★".repeat(5 - roundedStars)}</span>
                </span>
                <span className="mt-1 block text-[15px] text-[#346aff]">
                  ({reviewCount.toLocaleString()})
                </span>
              </>
            ) : (
              <span className="text-sm text-neutral-400">아직 리뷰가 없어요</span>
            )}
          </Link>
        </div>

        <span className="mt-3 inline-block rounded bg-[#6b7684] px-2 py-0.5 text-[13px] font-semibold text-white">
          {company.isAvailable ? "예약 가능" : "예약 마감"}
        </span>

        <h1 className="mt-3 text-[19px] leading-snug text-neutral-900">{company.name}</h1>

        <CompanyDetailDynamic
          companyId={company.id}
          services={services}
          companyIntroText={company.introText}
          attributes={[
            ...(regionText ? [{ label: "서비스지역", value: regionText }] : []),
            ...(company.businessHours ? [{ label: "영업시간", value: company.businessHours }] : []),
          ]}
          workPhotos={workPhotos}
          beforeAfterPhotos={beforeAfterPhotos}
          initialCategoryId={initialCategoryId ?? null}
          websiteUrl={company.websiteUrl}
          phone={company.phone}
        />
      </div>

      <div className="mt-6 h-2 bg-[#f2f3f6]" />
      <section className="px-4 py-5">
        <h2 className="text-lg font-bold">이용 안내</h2>
        <InfoRows
          rows={[
            { label: "서비스 지역", value: regionText || "-" },
            { label: "영업시간", value: company.businessHours ?? "-" },
            { label: "예약 가능 여부", value: company.isAvailable ? "예약 가능" : "예약 마감" },
            ...(company.phone ? [{ label: "연락처", value: company.phone }] : []),
          ]}
        />
      </section>

      <div className="h-2 bg-[#f2f3f6]" />
      <section className="px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            리뷰 {reviewCount > 0 && <span className="text-[#346aff]">{reviewCount.toLocaleString()}</span>}
          </h2>
          {reviewCount > 0 && (
            <Link
              href={`/companies/${id}/reviews`}
              className="flex items-center text-sm text-neutral-500"
            >
              전체보기
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          )}
        </div>
        <RatingDistribution
          averageRating={averageRating}
          reviewCount={reviewCount}
          counts={ratingCounts}
        />
        <ReviewPhotoStrip reviews={reviewItems} />
        {reviewItems.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3">
            {reviewItems.slice(0, PREVIEW_REVIEW_COUNT).map((review) => (
              <ReviewCard key={review.id} review={review} reportHref={`/reviews/${review.id}/report`} />
            ))}
          </ul>
        )}
        {reviewItems.length > PREVIEW_REVIEW_COUNT && (
          <Link
            href={`/companies/${id}/reviews`}
            className="mt-4 flex items-center justify-center rounded-md border border-neutral-300 py-3 text-sm font-semibold text-neutral-800"
          >
            리뷰 {reviewCount.toLocaleString()}개 전체보기
          </Link>
        )}
      </section>

      <ScrollToTopButton />
    </main>
  );
}

// Coupang shows a few reviews inline and sends the rest to a dedicated
// review page (companies/[id]/reviews) rather than one endless scroll.
const PREVIEW_REVIEW_COUNT = 3;
