"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export type PhotoItem = { id: string; url: string };

// Coupang-style "더 보기" fold height — enough to show roughly one photo's
// worth before the customer has to opt into the rest, not just a sliver.
const COLLAPSED_HEIGHT = 560;

/**
 * Coupang-style detail images: full-width, each at its own natural aspect
 * ratio (never cropped to a square) and stacked with zero gap — so a tall
 * infographic split into several uploads tiles back together seamlessly,
 * the way Coupang's own long detail images are often several images in a
 * row. Plain <img> instead of next/image: we don't know a photo's
 * dimensions before it's uploaded, so there's no size to pass next/image's
 * required width/height (or a fill container with a matching aspect-ratio).
 *
 * Collapses behind a "더 보기" button when there's more than one photo (a
 * single photo is never worth folding), matching Coupang's own long detail
 * page — a fade-to-white gradient hints there's more below. extraTile (the
 * owner's "+" upload button) always stays outside the fold so adding a
 * photo never requires expanding first.
 *
 * Used read-only on the public detail page (no extraTile, hides when
 * empty) and interactively on the owner's preview (extraTile is the "+"
 * upload tile, so it always shows).
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
  const [expanded, setExpanded] = useState(false);

  if (photos.length === 0 && !extraTile) return null;

  const collapsible = photos.length > 1 && !expanded;

  return (
    <section className="mt-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="relative mt-2">
        <div
          className="flex flex-col overflow-hidden rounded-lg"
          style={collapsible ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
        >
          {photos.map((photo) => (
            <div key={photo.id} className="relative w-full bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio needed; see comment above */}
              <img src={photo.url} alt={title} loading="lazy" className="block w-full h-auto" />
              {photoOverlay?.(photo)}
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
