"use client";

import { useEffect, useState } from "react";

/**
 * Small floating circle, bottom-right, that appears once the page has been
 * scrolled down a bit and jumps back to the top — useful now that the
 * company detail page (and its owner-preview twin) can run long with
 * stacked detail images. Positioned within the same max-w-md column the
 * rest of the app's content sits in (not the raw viewport edge), so it
 * lines up with the content instead of drifting off to the side on a wide
 * screen.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 mx-auto w-full max-w-md">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="맨 위로"
        className="pointer-events-auto absolute bottom-0 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg"
      >
        ↑
      </button>
    </div>
  );
}
