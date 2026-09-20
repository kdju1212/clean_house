"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyCategoryProfile, saveMyCategoryProfile } from "@/app/categories/actions";
import { getReservationQuestions } from "@/lib/reservation-questions";

const TIP_SEEN_KEY = "categoryProfileTipSeen";

/**
 * "정보입력" button shown next to a category's title — opens a small form
 * for that category's questions (평수, 브랜드/형태/대수, ...) and saves it
 * as the customer's reusable CategoryProfile, which the listing page then
 * uses to show a PER_UNIT-priced company's estimated price instead of just
 * its per-평/대 rate. A category with no questions (세탁기청소 has none
 * marked as a pricing quantity, but 기타청소 has no questions at all)
 * renders nothing.
 */
export function CategoryProfileButton({
  categorySlug,
  initialAnswers,
  otherProfiles = {},
  categories = [],
}: {
  categorySlug: string;
  initialAnswers: Record<string, string> | null;
  // Every other category the customer has already saved a profile for,
  // keyed by slug — offered as a "불러오기" shortcut when it shares at
  // least one question with this category (평수 is common to every
  // space-based category, so 입주청소's saved values can fill in most of
  // 이사청소's form without retyping), even though the two are still
  // saved completely separately (see CategoryProfile's unique constraint).
  otherProfiles?: Record<string, Record<string, string>>;
  categories?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const questions = getReservationQuestions(categorySlug);
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initialAnswers ?? {});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionKeys = new Set(questions.map((q) => q.key));
  const importCandidates = categories
    .filter((c) => c.slug !== categorySlug)
    .map((c) => ({ category: c, profile: otherProfiles[c.slug] }))
    .filter(
      (c): c is { category: { slug: string; name: string }; profile: Record<string, string> } =>
        !!c.profile && Object.keys(c.profile).some((key) => questionKeys.has(key))
    );

  function toggleMultiOption(key: string, option: string) {
    setValues((prev) => {
      const selected = (prev[key] ?? "").split(",").filter(Boolean);
      const next = selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option];
      return { ...prev, [key]: next.join(",") };
    });
  }

  function importFrom(profile: Record<string, string>) {
    setValues((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(profile)) {
        if (questionKeys.has(key)) next[key] = profile[key];
      }
      return next;
    });
  }

  useEffect(() => {
    if (questions.length === 0) return;
    try {
      // Reading localStorage is only possible client-side (this runs once
      // after mount, never during SSR) — there's no external event to
      // subscribe to afterwards, just a one-time check, so a direct
      // setState here is the synchronize-with-an-external-system case the
      // lint rule's own docs describe, not the cascading-render pattern it
      // warns about.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(TIP_SEEN_KEY)) setShowTip(true);
    } catch {
      // localStorage can throw in private browsing — the tip just doesn't
      // show then, which isn't worth breaking the page over.
    }
  }, [questions.length]);

  if (questions.length === 0) return null;

  function dismissTip() {
    setShowTip(false);
    try {
      localStorage.setItem(TIP_SEEN_KEY, "1");
    } catch {
      // see above
    }
  }

  function handleOpen() {
    dismissTip();
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("categorySlug", categorySlug);
      for (const q of questions) formData.set(q.key, values[q.key] ?? "");

      const result = await saveMyCategoryProfile(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      const result = await deleteMyCategoryProfile(categorySlug);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setValues({});
      setOpen(false);
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700"
      >
        {initialAnswers ? "내 정보 수정" : "정보입력"}
      </button>

      {showTip && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg">
          여기에 정보를 입력하면 정확한 예상 금액을 볼 수 있어요
          <button
            type="button"
            onClick={dismissTip}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-[10px]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">내 정보 입력</h2>
              {initialAnswers && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs text-neutral-400 underline disabled:opacity-50"
                >
                  {resetting ? "초기화 중..." : "초기화"}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              업체 목록에서 이 정보를 기준으로 예상 가격을 보여드려요.
            </p>

            {importCandidates.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-neutral-400">불러오기:</span>
                {importCandidates.map(({ category, profile }) => (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => importFrom(profile)}
                    className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3">
              {questions.map((q) =>
                q.type === "select" && q.multiple ? (
                  <div key={q.key} className="flex flex-col gap-1 text-sm font-medium">
                    {q.label} (복수 선택 가능)
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((option) => {
                        const active = (values[q.key] ?? "").split(",").includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleMultiOption(q.key, option)}
                            className={
                              active
                                ? "rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-sm font-normal text-white"
                                : "rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-normal text-neutral-700"
                            }
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : q.type === "select" ? (
                  <label key={q.key} className="flex flex-col gap-1 text-sm font-medium">
                    {q.label}
                    <select
                      value={values[q.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [q.key]: e.target.value }))}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
                    >
                      <option value="" disabled>
                        선택해주세요
                      </option>
                      {q.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={q.key} className="flex flex-col gap-1 text-sm font-medium">
                    {q.label}
                    <input
                      type={q.type === "number" ? "number" : "text"}
                      value={values[q.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [q.key]: e.target.value }))}
                      placeholder={q.placeholder}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
                    />
                  </label>
                )
              )}
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
