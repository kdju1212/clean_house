"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Wraps an already-rendered thumbnail/hero image so tapping it opens a
 * full-screen overlay with the same photo at full size — used by the
 * company detail page's hero (Gallery) and review photos (ReviewCard/
 * ReviewPhotoStrip), which otherwise only ever show a small crop.
 */
export function ImageZoom({
  src,
  alt,
  className,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="사진 크게 보기"
        className={className ?? "block h-full w-full"}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative h-full w-full">
            <Image src={src} alt={alt} fill sizes="100vw" className="object-contain" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-xl text-white"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
