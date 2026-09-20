"use client";

import { useEffect, useRef, useState } from "react";

const TABS = [
  { id: "info-section", label: "정보" },
  { id: "review-section", label: "리뷰" },
] as const;

/**
 * Tab nav for the company detail page: tapping a tab scrolls to that
 * section, and scrolling manually updates which tab is highlighted. Not
 * pinned to the top while scrolling — it scrolls away with the rest of the
 * page like any other section.
 */
export function DetailTabs({ reviewCount }: { reviewCount: number }) {
  const [active, setActive] = useState<string>(TABS[0].id);
  // Suppresses the scroll-driven observer while a tab click's own
  // scrollIntoView is still animating — otherwise the tab flickers back to
  // whichever section still straddles the trigger line mid-scroll.
  const scrollingToRef = useRef(false);

  useEffect(() => {
    const sections = TABS.map((t) => document.getElementById(t.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingToRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-50px 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleClick(id: string) {
    setActive(id);
    scrollingToRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      scrollingToRef.current = false;
    }, 600);
  }

  return (
    <div className="flex border-b border-neutral-200 bg-white px-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => handleClick(tab.id)}
          className={`flex-1 border-b-2 py-3 text-sm font-medium ${
            active === tab.id
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400"
          }`}
        >
          {tab.id === "review-section"
            ? `리뷰${reviewCount > 0 ? ` ${reviewCount}` : ""}`
            : tab.label}
        </button>
      ))}
    </div>
  );
}
