"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReview, requestReviewPhotoUploadUrl } from "./actions";

export function ReviewForm({ reservationId }: { reservationId: string }) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (content.trim().length === 0) {
      setError("리뷰 내용을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        let photoUrl: string | null = null;
        const file = fileInputRef.current?.files?.[0];
        if (file) {
          const { uploadUrl, publicUrl } = await requestReviewPhotoUploadUrl({
            reservationId,
            contentType: file.type,
            size: file.size,
          });
          const putResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!putResponse.ok) {
            throw new Error("사진 업로드에 실패했어요.");
          }
          photoUrl = publicUrl;
        }

        const result = await createReview({
          reservationId,
          rating,
          content,
          photoUrl,
        });
        router.push(`/companies/${result.companyId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "리뷰 등록에 실패했어요.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n}점`}
            className="text-3xl leading-none text-amber-400"
          >
            {n <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="어떤 점이 좋았는지, 아쉬웠는지 알려주세요."
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      />

      <label className="flex flex-col gap-1 text-sm font-medium">
        사진 (선택)
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm font-normal"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "등록 중..." : "리뷰 등록"}
      </button>
    </form>
  );
}
