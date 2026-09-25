import type { ReactNode } from "react";

export type GridPhotoItem = { id: string; url: string; caption: string | null };

/**
 * "내 사이트 템플릿" layout for the 상세페이지 section — a 2-column grid of
 * square thumbnails with each photo's own caption underneath, for a company
 * that just has ordinary work photos rather than a pre-made tall banner
 * image (see photo-stack.tsx for that alternative, CUSTOM_IMAGE mode).
 * Used read-only on the public detail page; the owner's dashboard wraps
 * each tile with its own edit controls via photoOverlay/captionSlot.
 */
export function PhotoGrid({
  title,
  photos,
  extraTile,
  photoOverlay,
  captionSlot,
}: {
  /** Omit when this grid is nested under a heading the caller already
   * renders itself (e.g. the dashboard's mode-toggle wrapper). */
  title?: string;
  photos: GridPhotoItem[];
  extraTile?: ReactNode;
  photoOverlay?: (photo: GridPhotoItem) => ReactNode;
  /** Replaces the plain caption <p> — the dashboard uses this to render an
   * editable input instead. */
  captionSlot?: (photo: GridPhotoItem) => ReactNode;
}) {
  if (photos.length === 0 && !extraTile) return null;

  return (
    <section className="mt-5">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      <div className="mt-2 grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <div key={photo.id}>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- consistent with photo-stack.tsx's own <img> */}
              <img src={photo.url} alt={photo.caption ?? title ?? ""} className="h-full w-full object-cover" />
              {photoOverlay?.(photo)}
            </div>
            {captionSlot ? (
              captionSlot(photo)
            ) : photo.caption ? (
              <p className="mt-1.5 text-[13px] text-neutral-600">{photo.caption}</p>
            ) : null}
          </div>
        ))}
      </div>
      {extraTile}
    </section>
  );
}
