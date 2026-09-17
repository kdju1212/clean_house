"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { confirmPhotoUpload, deletePhoto, requestPhotoUploadUrl, updateProfile } from "./actions";
import { BusinessHoursPicker } from "./business-hours-picker";
import { formatPhoneNumber } from "./phone-format";
import { PhotoStack, type PhotoItem } from "@/components/company-detail/photo-stack";
import { RatingDistribution } from "@/components/company-detail/rating-distribution";
import { ReviewCard, ReviewPhotoStrip, type ReviewItem } from "@/components/company-detail/review-list";

type Photo = PhotoItem;

type Service = {
  id: string;
  categoryName: string;
  price: number;
  description: string | null;
};

/**
 * A live clone of the real company detail page (src/app/companies/[id]/page.tsx)
 * embedded right in the dashboard — same layout, same classes — except the
 * gallery photo and the two photo stacks are click-to-upload. This is
 * "미리보기" in the literal sense: what the owner sees here is what a
 * customer sees, and tapping a photo spot uploads straight into it instead
 * of going through a separate form disconnected from the actual page.
 */
export function CompanyPagePreview({
  company,
  services,
  regionNames,
  averageRating,
  reviewCount,
  ratingCounts,
  workPhotos,
  beforeAfterPhotos,
  reviews,
}: {
  company: {
    name: string;
    introText: string | null;
    businessHours: string | null;
    isAvailable: boolean;
    phone: string | null;
    mainImageUrl: string | null;
  };
  services: Service[];
  regionNames: string[];
  averageRating: number;
  reviewCount: number;
  ratingCounts: number[];
  workPhotos: Photo[];
  beforeAfterPhotos: Photo[];
  reviews: ReviewItem[];
}) {
  const {
    inputRef: mainInputRef,
    uploading: mainUploading,
    error: mainError,
    pick: pickMain,
    handleChange: handleMainChange,
  } = usePhotoUpload("MAIN");

  const [name, setName] = useState(company.name);
  const [phone, setPhone] = useState(company.phone ?? "");
  const [introText, setIntroText] = useState(company.introText ?? "");
  const [businessHours, setBusinessHours] = useState(company.businessHours ?? "");
  const [isAvailable, setIsAvailable] = useState(company.isAvailable);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("phone", phone);
      formData.set("introText", introText);
      formData.set("businessHours", businessHours);
      if (isAvailable) formData.set("isAvailable", "on");

      const result = await updateProfile(undefined, formData);
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      <button
        type="button"
        onClick={pickMain}
        disabled={mainUploading}
        className="relative block aspect-square w-full bg-neutral-100"
      >
        {company.mainImageUrl ? (
          <Image
            src={company.mainImageUrl}
            alt={company.name}
            fill
            sizes="400px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-5xl">🧽</span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-[11px] font-medium text-white">
          {mainUploading ? "업로드 중..." : "탭해서 대표사진 등록/변경"}
        </span>
      </button>
      <input
        ref={mainInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleMainChange}
        className="hidden"
      />
      {mainError && <p className="px-4 pt-1 text-xs text-red-600">{mainError}</p>}

      <div className="px-4 py-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="업체명"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xl font-bold"
        />
        <p className="mt-1 text-sm text-neutral-500">
          {reviewCount > 0 ? (
            <>
              <span className="font-semibold text-amber-500">★ {averageRating.toFixed(1)}</span>{" "}
              리뷰 {reviewCount}개
            </>
          ) : (
            "아직 리뷰가 없어요"
          )}
        </p>
        <textarea
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          placeholder="업체 소개"
          rows={3}
          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600"
        />

        <section className="mt-5">
          <h2 className="text-sm font-semibold">서비스 · 가격</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{service.categoryName}</p>
                  {service.description && (
                    <p className="text-xs text-neutral-500">{service.description}</p>
                  )}
                </div>
                <p className="font-semibold">{service.price.toLocaleString()}원</p>
              </li>
            ))}
            {services.length === 0 && (
              <li className="text-sm text-neutral-400">아직 등록된 서비스가 없어요.</li>
            )}
          </ul>
        </section>

        <EditablePhotoStack title="작업 사진" type="WORK" photos={workPhotos} />
        <EditablePhotoStack title="전/후 비교" type="BEFORE_AFTER" photos={beforeAfterPhotos} />

        <div className="mt-5">
          <p className="text-sm font-medium">영업시간</p>
          <div className="mt-1.5">
            <BusinessHoursPicker value={businessHours} onChange={setBusinessHours} />
          </div>
        </div>

        <section className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
          <div className="flex justify-between px-3 py-2.5 text-sm">
            <span className="text-neutral-500">서비스 지역</span>
            <span className="text-right font-medium">{regionNames.join(", ") || "-"}</span>
          </div>
          <label className="flex items-center justify-between border-t border-neutral-100 px-3 py-2.5 text-sm">
            <span className="text-neutral-500">예약 가능 여부</span>
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
            />
          </label>
          <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2 text-sm">
            <span className="shrink-0 text-neutral-500">연락처</span>
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              required
              inputMode="numeric"
              maxLength={13}
              placeholder="010-0000-0000"
              className="ml-2 w-32 rounded-lg border border-neutral-200 px-2 py-1 text-right text-sm"
            />
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold">
            리뷰 {reviewCount > 0 ? `(${reviewCount})` : ""}
          </h2>
          <RatingDistribution
            averageRating={averageRating}
            reviewCount={reviewCount}
            counts={ratingCounts}
          />
          <ReviewPhotoStrip reviews={reviews} />
          {reviews.length > 0 && (
            <ul className="mt-3 flex flex-col gap-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
          )}
        </section>

        {saveError && <p className="mt-4 text-xs text-red-600">{saveError}</p>}
        {saved && <p className="mt-4 text-xs text-emerald-600">저장됐어요.</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
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

function EditablePhotoStack({
  title,
  type,
  photos,
}: {
  title: string;
  type: "WORK" | "BEFORE_AFTER";
  photos: Photo[];
}) {
  const { inputRef, uploading, error, pick, handleChange } = usePhotoUpload(type);

  return (
    <>
      <PhotoStack
        title={title}
        photos={photos}
        photoOverlay={(photo) => (
          <form action={deletePhoto} className="absolute right-2 top-2">
            <input type="hidden" name="photoId" value={photo.id} />
            <button
              type="submit"
              aria-label="사진 삭제"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white"
            >
              ×
            </button>
          </form>
        )}
        extraTile={
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="mt-2 flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 text-2xl text-neutral-400"
          >
            {uploading ? <span className="text-sm">업로드중</span> : "+ 사진 추가"}
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </>
  );
}
