"use client";

import { useActionState, useState } from "react";
import { TIME_SLOTS } from "@/lib/reservation";
import { getReservationQuestions } from "@/lib/reservation-questions";
import { SubmitButton } from "@/components/submit-button";
import { createReservation } from "../actions";

export function NewReservationForm({
  companyId,
  services,
  defaultCategoryId,
  defaultName,
  defaultPhone,
  todayStr,
  categoryProfiles,
}: {
  companyId: string;
  services: { categoryId: string; price: number; category: { name: string; slug: string } }[];
  defaultCategoryId?: string;
  defaultName: string;
  defaultPhone: string;
  todayStr: string;
  // Previously-saved answers per category slug (see CategoryProfileButton)
  // — pre-fills these fields so a repeat customer doesn't retype 평수 or
  // 브랜드/형태/대수 every time they book.
  categoryProfiles: Record<string, Record<string, string>>;
}) {
  const [state, formAction] = useActionState(createReservation, undefined);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? services[0]?.categoryId);

  const selectedService = services.find((s) => s.categoryId === categoryId);
  const selectedSlug = selectedService?.category.slug;
  const questions = selectedSlug ? getReservationQuestions(selectedSlug) : [];
  const savedAnswers = selectedSlug ? categoryProfiles[selectedSlug] : undefined;

  function handleLocate() {
    setLocateError(null);
    if (!("geolocation" in navigator)) {
      setLocateError("이 브라우저는 위치 정보를 지원하지 않아요.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `/api/mobile/address/reverse-geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          );
          const json = await res.json();
          if (!res.ok) {
            const detail = json?.detail ? ` (${json.detail})` : "";
            throw new Error((json?.error ?? "위치로 주소를 찾지 못했어요.") + detail);
          }
          setAddress(json.address);
        } catch (err) {
          setLocateError(err instanceof Error ? err.message : "위치로 주소를 찾지 못했어요.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError("위치 권한을 허용해주세요.");
        setLocating(false);
      }
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="companyId" value={companyId} />

      <label className="flex flex-col gap-1 text-sm font-medium">
        청소 종류
        <select
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        >
          {services.map((s) => (
            <option key={s.categoryId} value={s.categoryId}>
              {s.category.name} ({s.price.toLocaleString()}원~)
            </option>
          ))}
        </select>
      </label>

      {questions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3">
          <p className="text-xs text-neutral-500">
            업체가 정확한 견적을 낼 수 있도록 아래 정보를 알려주세요.
          </p>
          {questions.map((q) =>
            q.type === "select" && q.multiple ? (
              <div key={`${selectedSlug}-${q.key}`} className="flex flex-col gap-1 text-sm font-medium">
                {q.label} (복수 선택 가능)
                <div className="flex flex-wrap gap-2">
                  {q.options?.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-normal"
                    >
                      <input
                        type="checkbox"
                        name={`answer_${q.key}`}
                        value={option}
                        defaultChecked={(savedAnswers?.[q.key] ?? "").split(",").includes(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ) : q.type === "select" ? (
              <label
                key={`${selectedSlug}-${q.key}`}
                className="flex flex-col gap-1 text-sm font-medium"
              >
                {q.label}
                <select
                  name={`answer_${q.key}`}
                  required={q.required}
                  defaultValue={savedAnswers?.[q.key] ?? ""}
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
              <label
                key={`${selectedSlug}-${q.key}`}
                className="flex flex-col gap-1 text-sm font-medium"
              >
                {q.label}
                <input
                  name={`answer_${q.key}`}
                  type={q.type === "number" ? "number" : "text"}
                  required={q.required}
                  defaultValue={savedAnswers?.[q.key] ?? ""}
                  placeholder={q.placeholder}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
                />
              </label>
            )
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        서비스 주소
        <div className="flex gap-2">
          <input
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            placeholder="도로명 주소"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {locating ? "찾는 중..." : "내 위치로 찾기"}
          </button>
        </div>
      </label>
      {locateError && <p className="text-xs text-red-600">{locateError}</p>}
      <label className="flex flex-col gap-1 text-sm font-medium">
        상세 주소 (선택)
        <input
          name="addressDetail"
          placeholder="동/호수 등"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          희망 날짜
          <input
            name="desiredDate"
            type="date"
            min={todayStr}
            defaultValue={todayStr}
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          희망 시간
          <select
            name="desiredTime"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        이름
        <input
          name="name"
          defaultValue={defaultName}
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        연락처
        <input
          name="phone"
          type="tel"
          defaultValue={defaultPhone}
          required
          placeholder="010-0000-0000"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        요청사항 (선택)
        <textarea
          name="requestNote"
          rows={3}
          placeholder="업체에 미리 전달하고 싶은 내용을 적어주세요"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <SubmitButton
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="신청 중..."
      >
        예약 신청하기
      </SubmitButton>
    </form>
  );
}
