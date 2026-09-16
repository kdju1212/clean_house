import type { ReactNode } from "react";

export type PhotoItem = { id: string; url: string };

/**
 * Coupang-style detail images: full-width, each at its own natural aspect
 * ratio (never cropped to a square) and stacked with zero gap — so a tall
 * infographic split into several uploads tiles back together seamlessly,
 * the way Coupang's own long detail images are often several images in a
 * row. Plain <img> instead of next/image: we don't know a photo's
 * dimensions before it's uploaded, so there's no size to pass next/image's
 * required width/height (or a fill container with a matching aspect-ratio).
 * Used read-only on the public detail page (no extraTile, hides when empty)
 * and interactively on the owner's preview (extraTile is the "+" upload
 * tile, so it always shows).
 */
export function PhotoStack({
  title,
  photos,
  extraTile,
  photoOverlay,
}: {
  title: string;
  photos: PhotoItem[];
  extraTile?: ReactNode;
  photoOverlay?: (photo: PhotoItem) => ReactNode;
}) {
  if (photos.length === 0 && !extraTile) return null;

  return (
    <section className="mt-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2 flex flex-col overflow-hidden rounded-lg">
        {photos.map((photo) => (
          <div key={photo.id} className="relative w-full bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio needed; see comment above */}
            <img src={photo.url} alt={title} loading="lazy" className="block w-full h-auto" />
            {photoOverlay?.(photo)}
          </div>
        ))}
      </div>
      {extraTile}
    </section>
  );
}
