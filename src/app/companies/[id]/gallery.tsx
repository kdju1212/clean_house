"use client";

import { useState } from "react";
import Image from "next/image";

/** Coupang-style gallery: one large image + a thumbnail strip to switch it. */
export function Gallery({
  photos,
  alt,
}: {
  photos: { id: string; url: string }[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-5xl">
        🧽
      </div>
    );
  }

  const current = photos[Math.min(index, photos.length - 1)];

  return (
    <div>
      <div className="relative aspect-square w-full bg-neutral-100">
        <Image src={current.url} alt={alt} fill sizes="480px" priority className="object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번째 사진 보기`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ${
                i === index ? "ring-2 ring-neutral-900" : "opacity-60"
              }`}
            >
              <Image src={photo.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
