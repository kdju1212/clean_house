"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  confirmPhotoUpload,
  deletePhoto,
  requestPhotoUploadUrl,
  updateDetailPageMode,
  updatePhotoCaption,
  updateProfile,
} from "./actions";
import { BusinessHoursPicker } from "./business-hours-picker";
import { formatPhoneNumber } from "./phone-format";
import { PhotoStack, type PhotoItem } from "@/components/company-detail/photo-stack";
import { PhotoGrid } from "@/components/company-detail/photo-grid";
import { RatingDistribution } from "@/components/company-detail/rating-distribution";
import { ReviewCard, ReviewPhotoStrip, type ReviewItem } from "@/components/company-detail/review-list";

type Photo = PhotoItem & { categoryId: string | null; caption: string | null };
type DetailPageMode = "CUSTOM_IMAGE" | "SITE_TEMPLATE";

type Service = {
  id: string;
  categoryId: string;
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
  detailPageMode: initialDetailPageMode,
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
  detailPageMode: DetailPageMode;
  reviews: ReviewItem[];
}) {
  const {
    inputRef: mainInputRef,
    uploading: mainUploading,
    error: mainError,
    pick: pickMain,
    handleChange: handleMainChange,
  } = usePhotoUpload("MAIN", null, { requireSquare: true });

  // One CompanyService per category (unique constraint), so this is
  // already a plain list of {categoryId, categoryName} — offered as the
  // "이 사진, 어떤 카테고리 사진인가요?" tag choices below.
  const categories = services.map((s) => ({ id: s.categoryId, name: s.categoryName }));

  const router = useRouter();

  const [name, setName] = useState(company.name);
  const [phone, setPhone] = useState(company.phone ?? "");
  const [introText, setIntroText] = useState(company.introText ?? "");
  const [businessHours, setBusinessHours] = useState(company.businessHours ?? "");
  const [isAvailable, setIsAvailable] = useState(company.isAvailable);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [detailPageMode, setDetailPageMode] = useState<DetailPageMode>(initialDetailPageMode);
  const [modeError, setModeError] = useState<string | null>(null);

  // The fields below only take effect once "저장" is pressed (unlike photos/
  // mode/captions, which save immediately) — this is what's actually "저장
  // 안 하면 사라지는" state, so it's what the leave-without-saving guard
  // below tracks. Updated to the just-saved values after a successful save,
  // not just set once, so editing again after a save starts from a clean
  // baseline instead of comparing against the page's original load.
  const [savedFields, setSavedFields] = useState({
    name: company.name,
    phone: company.phone ?? "",
    introText: company.introText ?? "",
    businessHours: company.businessHours ?? "",
    isAvailable: company.isAvailable,
  });
  const isDirty =
    name !== savedFields.name ||
    phone !== savedFields.phone ||
    introText !== savedFields.introText ||
    businessHours !== savedFields.businessHours ||
    isAvailable !== savedFields.isAvailable;

  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Tab close/refresh/typing a new URL — the browser shows its own generic
  // "변경사항이 저장되지 않을 수 있습니다" dialog; the exact wording isn't
  // customizable by design (browsers dropped that to stop abuse).
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // In-app navigation (clicking any next/link elsewhere on the page, e.g.
  // "업체 관리로 돌아가기") — Next's App Router has no router-level
  // "before navigate" hook, so this catches it at the DOM level instead:
  // any left-click on an internal link while dirty is intercepted and
  // re-issued after the owner picks save-and-leave or leave-without-saving.
  useEffect(() => {
    if (!isDirty) return;
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      e.preventDefault();
      setPendingHref(href);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  async function handleModeChange(mode: DetailPageMode) {
    if (mode === detailPageMode) return;
    const previous = detailPageMode;
    setDetailPageMode(mode);
    setModeError(null);
    const result = await updateDetailPageMode(mode);
    if ("error" in result) {
      setDetailPageMode(previous);
      setModeError(result.error);
    }
  }

  /** Returns whether it actually saved — the leave-and-save flow needs to
   * know before it's safe to navigate away. */
  async function handleSave(): Promise<boolean> {
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
        return false;
      }
      setSavedFields({ name, phone, introText, businessHours, isAvailable });
      setSaved(true);
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndLeave() {
    if (await handleSave()) {
      const href = pendingHref;
      setPendingHref(null);
      if (href) router.push(href);
    }
  }

  function handleLeaveWithoutSaving() {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
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

        <section className="mt-5">
          <h2 className="text-sm font-semibold">상세페이지</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("CUSTOM_IMAGE")}
              className={`rounded-lg border px-3 py-2.5 text-left ${
                detailPageMode === "CUSTOM_IMAGE"
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200"
              }`}
            >
              <span className="block text-sm font-semibold">직접 올리기</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                준비한 세로로 긴 이미지를 그대로
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("SITE_TEMPLATE")}
              className={`rounded-lg border px-3 py-2.5 text-left ${
                detailPageMode === "SITE_TEMPLATE"
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200"
              }`}
            >
              <span className="block text-sm font-semibold">내 사이트 템플릿</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                사진 여러 장을 올리면 자동으로 꾸며드려요
              </span>
            </button>
          </div>
          {modeError && <p className="mt-1.5 text-xs text-red-600">{modeError}</p>}

          {detailPageMode === "SITE_TEMPLATE" ? (
            <EditablePhotoGrid photos={workPhotos} categories={categories} />
          ) : (
            <EditablePhotoStack photos={workPhotos} categories={categories} />
          )}
        </section>

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

      {pendingHref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setPendingHref(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-neutral-900">변경된 사항이 있어요</p>
            <p className="mt-1 text-sm text-neutral-500">
              저장하지 않고 나가면 수정한 내용이 사라져요.
            </p>
            {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveAndLeave}
                disabled={saving}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장하고 나가기"}
              </button>
              <button
                type="button"
                onClick={handleLeaveWithoutSaving}
                className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700"
              >
                저장하지 않고 나가기
              </button>
              <button
                type="button"
                onClick={() => setPendingHref(null)}
                className="w-full py-1.5 text-sm text-neutral-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reads a file's pixel dimensions without uploading it — used to gate the
 * 1:1-only main photo slot before spending a signed upload URL on it. */
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없어요."));
    };
    img.src = url;
  });
}

function usePhotoUpload(
  type: string,
  categoryId: string | null,
  options?: { requireSquare?: boolean }
) {
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

    if (options?.requireSquare) {
      try {
        const { width, height } = await readImageDimensions(file);
        if (width !== height) {
          setError("대표사진은 1:1(정사각형) 비율의 이미지만 등록할 수 있어요.");
          return;
        }
      } catch {
        setError("이미지를 불러올 수 없어요. 다른 사진으로 다시 시도해주세요.");
        return;
      }
    }

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

      const confirmResult = await confirmPhotoUpload({ publicId: signed.publicId, type, categoryId });
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

/** Shared by EditablePhotoStack and EditablePhotoGrid — which category the
 * *next* uploaded photo gets tagged with. Hidden when there's nothing to
 * distinguish (0 or 1 registered service). */
function CategoryTagPicker({
  value,
  onChange,
  categories,
}: {
  value: string | null;
  onChange: (categoryId: string) => void;
  categories: { id: string; name: string }[];
}) {
  if (categories.length <= 1) return null;
  return (
    <label className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
      새 사진 태그
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-200 px-1.5 py-1 text-xs"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditablePhotoStack({
  photos,
  categories,
}: {
  photos: Photo[];
  // Offered as "이 사진, 어떤 카테고리 사진인가요?" tag choices — empty when
  // the company hasn't registered any service yet, in which case there's
  // nothing to tag against and every photo just stays untagged (shown for
  // every category, since there's only ever one).
  categories: { id: string; name: string }[];
}) {
  const [uploadCategoryId, setUploadCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const { inputRef, uploading, error, pick, handleChange } = usePhotoUpload(
    "WORK",
    uploadCategoryId
  );
  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? "" : "전체 공통";

  return (
    <>
      <CategoryTagPicker
        value={uploadCategoryId}
        onChange={setUploadCategoryId}
        categories={categories}
      />
      <PhotoStack
        photos={photos}
        photoOverlay={(photo) => (
          <>
            {categories.length > 1 && (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
                {categoryName((photo as Photo).categoryId)}
              </span>
            )}
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
          </>
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

/** "내 사이트 템플릿" mode — same upload/tag/delete flow as
 * EditablePhotoStack, laid out as a grid with an editable caption under
 * each photo instead of one continuous stacked image. */
function EditablePhotoGrid({
  photos,
  categories,
}: {
  photos: Photo[];
  categories: { id: string; name: string }[];
}) {
  const [uploadCategoryId, setUploadCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const { inputRef, uploading, error, pick, handleChange } = usePhotoUpload(
    "WORK",
    uploadCategoryId
  );

  return (
    <>
      <CategoryTagPicker
        value={uploadCategoryId}
        onChange={setUploadCategoryId}
        categories={categories}
      />
      <PhotoGrid
        photos={photos}
        photoOverlay={(photo) => (
          <form action={deletePhoto} className="absolute right-1.5 top-1.5">
            <input type="hidden" name="photoId" value={photo.id} />
            <button
              type="submit"
              aria-label="사진 삭제"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white"
            >
              ×
            </button>
          </form>
        )}
        captionSlot={(photo) => (
          <CaptionInput photoId={photo.id} initialCaption={photo.caption} />
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

/** Saves on blur rather than per-keystroke — a caption per grid tile, so
 * typing shouldn't fire a Server Action on every character. */
function CaptionInput({
  photoId,
  initialCaption,
}: {
  photoId: string;
  initialCaption: string | null;
}) {
  const [value, setValue] = useState(initialCaption ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    setError(null);
    const result = await updatePhotoCaption(photoId, value);
    if ("error" in result) setError(result.error);
  }

  return (
    <div className="mt-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="사진 설명 (선택)"
        maxLength={60}
        className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700 placeholder:text-neutral-400"
      />
      {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
