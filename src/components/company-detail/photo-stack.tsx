"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type PhotoItem = {
  id: string;
  url: string;
  // Shown as a text block right under this photo (SITE_TEMPLATE mode) —
  // absent/null in CUSTOM_IMAGE mode, where photos stack with zero gap
  // instead. See DetailPageMode on the Company model.
  caption?: string | null;
};

// Coupang-style "더 보기" fold height — enough to show a couple of photos'
// worth before the customer has to opt into the rest, not just a sliver.
const COLLAPSED_HEIGHT = 1500;

/**
 * Coupang-style detail images: full-width, each at its own natural aspect
 * ratio (never cropped to a square) and stacked with zero gap — so a tall
 * infographic split into several uploads tiles back together seamlessly,
 * the way Coupang's own long detail images are often several images in a
 * row. In SITE_TEMPLATE mode each photo can carry its own caption, shown as
 * a text block right under it — assembling several ordinary photos into
 * something that still reads as one continuous long page. Plain <img>
 * instead of next/image: we don't know a photo's
 * dimensions before it's uploaded, so there's no size to pass next/image's
 * required width/height (or a fill container with a matching aspect-ratio).
 *
 * Collapses behind a "더 보기" button whenever the actual rendered content
 * is taller than the fold — which is just as often *one* very tall
 * infographic-style photo as it is several stacked ones, so this can't be
 * decided from photos.length alone; it has to measure real layout height
 * (a ResizeObserver on the content, since <img> intrinsic height isn't
 * known until each one finishes loading and the container grows). Starts
 * assuming it's tall (folds by default, like Coupang) rather than flashing
 * the full stack open first and snapping shut once measured.
 *
 * extraTile (the owner's "+" upload button) always stays outside the fold
 * so adding a photo never requires expanding first. Used read-only on the
 * public detail page (no extraTile, hides when empty) and interactively on
 * the owner's preview (extraTile is the "+" upload tile, so it always
 * shows).
 */
export function PhotoStack({
  title,
  photos,
  extraTile,
  photoOverlay,
  captionSlot,
}: {
  /** Omit when this stack is nested under a heading the caller already
   * renders itself (e.g. the dashboard's mode-toggle wrapper). */
  title?: string;
  photos: PhotoItem[];
  extraTile?: ReactNode;
  photoOverlay?: (photo: PhotoItem) => ReactNode;
  /** Replaces the plain caption <p> — the dashboard's SITE_TEMPLATE editor
   * uses this to render an editable input instead. */
  captionSlot?: (photo: PhotoItem) => ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(photos.length > 0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const check = () => setOverflowing(el.scrollHeight > COLLAPSED_HEIGHT);
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [photos]);

  if (photos.length === 0 && !extraTile) return null;

  const collapsible = overflowing && !expanded;

  return (
    <section className="mt-5">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      <div className="relative mt-2">
        <div
          ref={contentRef}
          className="flex flex-col overflow-hidden rounded-lg"
          style={collapsible ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
        >
          {photos.map((photo) => (
            <div key={photo.id}>
              <div className="relative w-full bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio needed; see comment above */}
                <img src={photo.url} alt={title ?? ""} loading="lazy" className="block w-full h-auto" />
                {photoOverlay?.(photo)}
              </div>
              {captionSlot
                ? captionSlot(photo)
                : photo.caption && (
                    <p className="px-1 py-3 text-[15px] leading-relaxed text-neutral-700">
                      {photo.caption}
                    </p>
                  )}
            </div>
          ))}
        </div>
        {collapsible && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600"
        >
          이미지 더 보기 ⌄
        </button>
      )}
      {extraTile}
    </section>
  );
}
