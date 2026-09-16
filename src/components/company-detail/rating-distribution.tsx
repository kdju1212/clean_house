/**
 * Coupang-style rating summary: big average + star row on the left, a
 * 5→1 star horizontal bar breakdown on the right showing how many
 * reviews landed at each rating.
 */
export function RatingDistribution({
  averageRating,
  reviewCount,
  counts,
}: {
  averageRating: number;
  reviewCount: number;
  counts: number[]; // index 0 = 5-star count, index 4 = 1-star count
}) {
  if (reviewCount === 0) {
    return <p className="mt-3 text-sm text-neutral-400">아직 작성된 리뷰가 없어요.</p>;
  }

  const roundedStars = Math.round(averageRating);

  return (
    <div className="mt-3 flex items-center gap-4">
      <div className="flex shrink-0 flex-col items-center">
        <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
        <p className="mt-1 text-sm text-amber-500">
          {"★".repeat(roundedStars)}
          {"☆".repeat(5 - roundedStars)}
        </p>
        <p className="mt-1 text-xs text-neutral-400">리뷰 {reviewCount}개</p>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star, i) => {
          const count = counts[i] ?? 0;
          const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="w-6 shrink-0">{star}점</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
