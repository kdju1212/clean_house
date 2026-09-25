"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";

/** Round ‹ button overlaid on the detail page's hero image, Coupang-style.
 * Falls back to the home page when there's no in-site page to go back to
 * (e.g. the detail page was opened directly from a shared link). */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="뒤로가기"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-sm backdrop-blur"
    >
      <ChevronLeftIcon className="h-6 w-6" />
    </button>
  );
}
