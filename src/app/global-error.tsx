"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center text-neutral-900">
        <p className="text-4xl">😵</p>
        <h1 className="mt-4 text-lg font-bold">문제가 발생했어요</h1>
        <p className="mt-2 text-sm text-neutral-500">
          앱을 불러오는 중 오류가 발생했어요. 다시 시도해주세요.
        </p>
        <button
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
