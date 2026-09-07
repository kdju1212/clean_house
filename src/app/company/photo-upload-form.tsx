"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmPhotoUpload, requestPhotoUploadUrl } from "./actions";

const TYPE_OPTIONS = [
  { value: "WORK", label: "작업사진" },
  { value: "MAIN", label: "대표사진" },
  { value: "BEFORE_AFTER", label: "전/후 비교" },
];

export function PhotoUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("WORK");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("사진을 선택해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const { uploadUrl, key } = await requestPhotoUploadUrl({
          contentType: file.type,
          size: file.size,
        });

        const putResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putResponse.ok) {
          throw new Error("업로드에 실패했어요. 다시 시도해주세요.");
        }

        await confirmPhotoUpload({ key, type });

        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드에 실패했어요.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "업로드 중..." : "업로드"}
      </button>
    </form>
  );
}
