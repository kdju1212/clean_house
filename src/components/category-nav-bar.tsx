"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const EMOJI_BY_SLUG: Record<string, string> = {
  "move-in": "🏠",
  moving: "📦",
  residential: "🧹",
  office: "🏢",
  restaurant: "🍽️",
  store: "🏬",
  aircon: "❄️",
  washer: "🧺",
  etc: "✨",
};

/**
 * Danggeun-style horizontal category bar pinned above a company listing —
 * "전체" (activeSlug null) links back to the home page, each category links
 * to its own /categories/[slug] results page. Shared by both so switching
 * category never requires going back through a separate picker page.
 */
export function CategoryNavBar({
  categories,
  activeSlug,
}: {
  categories: { slug: string; name: string }[];
  activeSlug: string | null;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // A category further down the list (에어컨청소, 세탁기청소, ...) starts
    // outside the visible scroll area — without this its highlighted pill
    // is invisible until the customer happens to scroll right to find it.
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeSlug]);

  return (
    <nav className="sticky top-[45px] z-10 -mx-4 flex gap-2 overflow-x-auto bg-white px-4 py-2 shadow-[0_1px_0_0_#f5f5f5]">
      <Link
        ref={activeSlug === null ? activeRef : undefined}
        href="/"
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
          activeSlug === null
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-200 text-neutral-600"
        }`}
      >
        전체
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          ref={activeSlug === c.slug ? activeRef : undefined}
          href={`/categories/${c.slug}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
            activeSlug === c.slug
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600"
          }`}
        >
          <span aria-hidden>{EMOJI_BY_SLUG[c.slug] ?? "🧽"}</span>
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
