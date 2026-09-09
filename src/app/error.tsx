"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="mt-4 text-lg font-bold">문제가 발생했어요</h1>
      <p className="mt-2 text-sm text-neutral-500">
        페이지를 불러오는 중 오류가 발생했어요. 다시 시도해주세요.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => retry()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
