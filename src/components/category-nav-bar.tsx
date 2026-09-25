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
 * each category links to its own /categories/[slug] results page, so
 * switching category never requires going back through a separate picker
 * page. No "전체" (all-categories-merged) entry — / itself just redirects
 * to the first category, see src/app/page.tsx.
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
    <nav className="sticky top-[57px] z-10 -mx-4 flex gap-2 overflow-x-auto bg-white px-4 py-2.5 [scrollbar-width:none]">
      {categories.map((c) => (
        <Link
          key={c.slug}
          ref={activeSlug === c.slug ? activeRef : undefined}
          href={`/categories/${c.slug}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[15px] ${
            activeSlug === c.slug
              ? "bg-neutral-900 font-semibold text-white"
              : "bg-[#f2f3f6] font-medium text-neutral-900"
          }`}
        >
          <span aria-hidden>{EMOJI_BY_SLUG[c.slug] ?? "🧽"}</span>
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
