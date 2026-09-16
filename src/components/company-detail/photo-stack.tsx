import type { ReactNode } from "react";
import Image from "next/image";

export type PhotoItem = { id: string; url: string };

/**
 * Coupang-style detail images: full-width, stacked vertically, one after
 * another — not a small thumbnail grid. Used read-only on the public detail
 * page (no extraTile, hides when empty) and interactively on the owner's
 * preview (extraTile is the "+" upload tile, so it always shows).
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
      <div className="mt-2 flex flex-col gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100"
          >
            <Image src={photo.url} alt={title} fill sizes="480px" className="object-cover" />
            {photoOverlay?.(photo)}
          </div>
        ))}
        {extraTile}
      </div>
    </section>
  );
}
