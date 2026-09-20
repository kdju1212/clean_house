import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RatingDistribution } from "@/components/company-detail/rating-distribution";
import { ReviewCard, ReviewPhotoStrip } from "@/components/company-detail/review-list";

/**
 * Coupang-style dedicated review list: tapping the ★ rating line on the
 * company detail page lands here instead of jumping to an in-page section —
 * see companies/[id]/page.tsx's rating Link.
 */
export default async function CompanyReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [company, reviews, ratingSummary, ratingGroups] = await Promise.all([
    prisma.company.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
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

  const averageRating = ratingSummary._avg.rating ?? 0;
  const reviewCount = ratingSummary._count;
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => ratingGroups.find((g) => g.rating === star)?._count ?? 0
  );
  const reviewItems = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    createdAt: r.createdAt,
    customerName: r.customer.name ?? "익명",
    content: r.content,
    photoUrls: r.photos.length > 0 ? r.photos.map((p) => p.url) : r.photoUrl ? [r.photoUrl] : [],
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href={`/companies/${id}`} className="text-xs font-medium text-neutral-400 underline">
        ← {company.name}로 돌아가기
      </Link>

      <h1 className="mt-3 text-lg font-bold">리뷰 {reviewCount > 0 ? `(${reviewCount})` : ""}</h1>

      <RatingDistribution averageRating={averageRating} reviewCount={reviewCount} counts={ratingCounts} />
      <ReviewPhotoStrip reviews={reviewItems} />
      {reviewItems.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {reviewItems.map((review) => (
            <ReviewCard key={review.id} review={review} reportHref={`/reviews/${review.id}/report`} />
          ))}
        </ul>
      )}
    </main>
  );
}
