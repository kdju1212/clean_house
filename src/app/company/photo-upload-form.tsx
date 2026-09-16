"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmPhotoUpload, requestPhotoUploadUrl } from "./actions";

const TYPE_OPTIONS = [
  {
    value: "MAIN",
    emoji: "⭐",
    label: "대표사진",
    hint: "목록 카드 + 상세페이지 맨 위",
  },
  {
    value: "WORK",
    emoji: "🧹",
    label: "작업사진",
    hint: "상세페이지 '작업 사진' 영역",
  },
  {
    value: "BEFORE_AFTER",
    emoji: "🔄",
    label: "전/후 비교",
    hint: "상세페이지 '전/후 비교' 영역",
  },
];

export function PhotoUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("WORK");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [successLabel, setSuccessLabel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Revoke the object URL whenever it changes or the component unmounts,
  // so selecting a new file (or navigating away) doesn't leak the blob.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccessLabel(null);
    const file = e.target.files?.[0];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function resetPreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessLabel(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("사진을 선택해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const signed = await requestPhotoUploadUrl({
          contentType: file.type,
          size: file.size,
        });
        if ("error" in signed) {
          setError(signed.error);
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("public_id", signed.publicId);
        formData.append("timestamp", String(signed.timestamp));
        formData.append("api_key", signed.apiKey);
        formData.append("signature", signed.signature);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        if (!uploadResponse.ok) {
          setError("업로드에 실패했어요. 다시 시도해주세요.");
          return;
        }

        const confirmResult = await confirmPhotoUpload({ publicId: signed.publicId, type });
        if ("error" in confirmResult) {
          setError(confirmResult.error);
          return;
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
        resetPreview();
        // The new thumbnail lands in the photo grid above this form, out of
        // view if the customer scrolled down to upload — without this,
        // "did it actually work?" is answered only by scrolling back up.
        setSuccessLabel(TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "사진");
        router.refresh();
      } catch {
        setError("업로드에 실패했어요.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-600">
        어디에 쓸 사진인가요? 아래에서 먼저 골라주세요.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {TYPE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setType(o.value)}
            aria-pressed={type === o.value}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors ${
              type === o.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-700"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {o.emoji}
            </span>
            <span className="text-xs font-semibold">{o.label}</span>
            <span
              className={`text-[10px] leading-tight ${
                type === o.value ? "text-neutral-300" : "text-neutral-400"
              }`}
            >
              {o.hint}
            </span>
          </button>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        onChange={handleFileChange}
        className="text-sm"
      />
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a next/image-optimizable remote URL
        <img
          src={previewUrl}
          alt="선택한 사진 미리보기"
          className="h-32 w-32 rounded-lg border border-neutral-200 object-cover"
        />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {successLabel && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          ✅ {successLabel}(으)로 등록됐어요 — 위 사진 목록에서 확인해보세요.
        </p>
      )}
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
