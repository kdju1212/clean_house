import type { ReactNode } from "react";
import Image from "next/image";

export type PhotoItem = { id: string; url: string };

/**
 * Shared 3-col photo grid for 작업 사진 / 전/후 비교 — used read-only on the
 * public detail page (no extraTile, hides when empty) and interactively on
 * the owner's preview (extraTile is the "+" upload tile, so it always shows).
 */
export function PhotoGrid({
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
      <div className="mt-2 grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
          >
            <Image src={photo.url} alt={title} fill sizes="120px" className="object-cover" />
            {photoOverlay?.(photo)}
          </div>
        ))}
        {extraTile}
      </div>
    </section>
  );
}
