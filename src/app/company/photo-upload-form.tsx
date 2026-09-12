"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
        router.refresh();
      } catch {
        setError("업로드에 실패했어요.");
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
