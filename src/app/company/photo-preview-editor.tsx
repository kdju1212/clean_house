"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { confirmPhotoUpload, deletePhoto, requestPhotoUploadUrl } from "./actions";

type Photo = { id: string; url: string };

const SECTION_META = {
  WORK: { title: "작업 사진", hint: "상세페이지 '작업 사진' 영역" },
  BEFORE_AFTER: { title: "전/후 비교", hint: "상세페이지 '전/후 비교' 영역" },
} as const;

/**
 * Mirrors the live company detail page's exact layout (gallery photo, then
 * a 3-col grid per section) instead of a separate "pick a type from a
 * dropdown" form — clicking a slot uploads directly into that slot, so
 * there's nothing to explain: what you see here is what a customer sees.
 */
export function PhotoPreviewEditor({
  mainImageUrl,
  workPhotos,
  beforeAfterPhotos,
}: {
  mainImageUrl: string | null;
  workPhotos: Photo[];
  beforeAfterPhotos: Photo[];
}) {
  return (
    <div className="mt-3 flex flex-col gap-5">
      <MainSlot url={mainImageUrl} />
      <TileGrid type="WORK" photos={workPhotos} />
      <TileGrid type="BEFORE_AFTER" photos={beforeAfterPhotos} />
    </div>
  );
}

function usePhotoUpload(type: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function pick() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const signed = await requestPhotoUploadUrl({ contentType: file.type, size: file.size });
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

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) {
        setError("업로드에 실패했어요. 다시 시도해주세요.");
        return;
      }

      const confirmResult = await confirmPhotoUpload({ publicId: signed.publicId, type });
      if ("error" in confirmResult) {
        setError(confirmResult.error);
        return;
      }

      router.refresh();
    } catch {
      setError("업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  }

  return { inputRef, uploading, error, pick, handleChange };
}

function MainSlot({ url }: { url: string | null }) {
  const { inputRef, uploading, error, pick, handleChange } = usePhotoUpload("MAIN");

  return (
    <div>
      <p className="text-xs font-medium text-neutral-600">
        대표사진 <span className="font-normal text-neutral-400">· 목록 카드 + 상세페이지 맨 위</span>
      </p>
      <button
        type="button"
        onClick={pick}
        disabled={uploading}
        className="relative mt-1 block aspect-square w-full overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50"
      >
        {url ? (
          <Image src={url} alt="대표사진" fill sizes="400px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-neutral-400">
            + 대표사진 추가
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
            업로드 중...
          </span>
        )}
        {url && !uploading && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white">
            사진 바꾸기
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function TileGrid({ type, photos }: { type: "WORK" | "BEFORE_AFTER"; photos: Photo[] }) {
  const { inputRef, uploading, error, pick, handleChange } = usePhotoUpload(type);
  const meta = SECTION_META[type];

  return (
    <div>
      <p className="text-xs font-medium text-neutral-600">
        {meta.title} <span className="font-normal text-neutral-400">· {meta.hint}</span>
      </p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-lg border border-neutral-100 bg-neutral-100"
          >
            <Image src={photo.url} alt={meta.title} fill sizes="120px" className="object-cover" />
            <form action={deletePhoto} className="absolute right-1 top-1">
              <input type="hidden" name="photoId" value={photo.id} />
              <button
                type="submit"
                aria-label="사진 삭제"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white"
              >
                ×
              </button>
            </form>
          </div>
        ))}
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-300 text-2xl text-neutral-400"
        >
          {uploading ? <span className="text-xs">업로드중</span> : "+"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
