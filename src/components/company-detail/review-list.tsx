import Image from "next/image";
import Link from "next/link";
import { ImageZoom } from "@/components/image-zoom";

export type ReviewItem = {
  id: string;
  rating: number;
  createdAt: Date;
  customerName: string;
  content: string;
  // Built by the caller from ReviewPhoto (falling back to the legacy single
  // photoUrl for a review written before that existed) — see
  // src/app/companies/[id]/page.tsx.
  photoUrls: string[];
};

/** Horizontal strip of review photos, Coupang-style, above the review cards
 * — one tile per photo, not per review, so a multi-photo review shows all
 * of them here too. Tapping a tile opens that photo full-screen. */
export function ReviewPhotoStrip({ reviews }: { reviews: ReviewItem[] }) {
  const photos = reviews.flatMap((r) =>
    r.photoUrls.map((url) => ({ key: `${r.id}-${url}`, url }))
  );
  if (photos.length === 0) return null;

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {photos.map((photo) => (
        <ImageZoom
          key={photo.key}
          src={photo.url}
          alt="리뷰 사진"
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
        >
          <Image src={photo.url} alt="리뷰 사진" fill sizes="80px" className="object-cover" />
        </ImageZoom>
      ))}
    </div>
  );
}

export function ReviewCard({ review, reportHref }: { review: ReviewItem; reportHref?: string }) {
  return (
    <li className="rounded-xl border border-neutral-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-amber-500">
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </span>
        <span className="text-xs text-neutral-400">
          {review.createdAt.toLocaleDateString("ko-KR")}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{review.customerName}</p>
      <p className="mt-2 text-sm text-neutral-700">{review.content}</p>
      {review.photoUrls.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {review.photoUrls.map((url) => (
            <ImageZoom
              key={url}
              src={url}
              alt="리뷰 사진"
              className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
            >
              <Image src={url} alt="리뷰 사진" fill sizes="96px" className="object-cover" />
            </ImageZoom>
          ))}
        </div>
      )}
      {reportHref && (
        <Link href={reportHref} className="mt-2 inline-block text-[11px] text-neutral-400 underline">
          신고
        </Link>
      )}
    </li>
  );
}
