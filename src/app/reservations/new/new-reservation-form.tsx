"use client";

import { useActionState, useState } from "react";
import { TIME_SLOTS } from "@/lib/reservation";
import {
  getPricingQuantityKey,
  getReservationQuestions,
  PRICING_UNIT_LABEL,
} from "@/lib/reservation-questions";
import { SubmitButton } from "@/components/submit-button";
import { DateCalendarPicker, formatDateLabel } from "@/components/date-calendar-picker";
import { createReservation } from "../actions";

/** "YYYY-MM-DD" -> the following day. */
function nextDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

export function NewReservationForm({
  companyId,
  services,
  defaultCategoryId,
  defaultName,
  defaultPhone,
  todayStr,
  categoryProfiles,
  blockedDates,
}: {
  companyId: string;
  services: {
    categoryId: string;
    price: number;
    pricingUnit: "FLAT" | "PER_UNIT";
    category: { name: string; slug: string };
  }[];
  defaultCategoryId?: string;
  defaultName: string;
  defaultPhone: string;
  todayStr: string;
  // Previously-saved answers per category slug (see CategoryProfileButton)
  // — pre-fills these fields so a repeat customer doesn't retype 평수 or
  // 브랜드/형태/대수 every time they book.
  categoryProfiles: Record<string, Record<string, string>>;
  // "YYYY-MM-DD" strings, today or later — see src/app/company/schedule.
  // Purely a client-side heads-up; createReservationForCustomer re-checks
  // this server-side regardless.
  blockedDates: string[];
}) {
  const [state, formAction] = useActionState(createReservation, undefined);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const initial = defaultCategoryId ?? services[0]?.categoryId;
    return initial ? [initial] : [];
  });
  const blockedDateSet = new Set(blockedDates);
  // Today can itself be a 휴무일 — start on the first day that can be booked.
  const [desiredDate, setDesiredDate] = useState(() => {
    let date = todayStr;
    for (let i = 0; i < 366 && blockedDateSet.has(date); i++) date = nextDateStr(date);
    return date;
  });
  const isDesiredDateBlocked = blockedDateSet.has(desiredDate);

  const selectedServices = services.filter((s) => selectedIds.includes(s.categoryId));

  function toggleService(categoryId: string) {
    setSelectedIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }

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

      <div className="flex flex-col gap-1 text-sm font-medium">
        청소 종류 {services.length > 1 && <span className="font-normal text-neutral-400">(여러 개 선택 가능)</span>}
        <div className="flex flex-col gap-2">
          {services.map((s) => {
            const unitLabel =
              s.pricingUnit === "PER_UNIT"
                ? PRICING_UNIT_LABEL[getPricingQuantityKey(s.category.slug) ?? ""]
                : null;
            const checked = selectedIds.includes(s.categoryId);
            return (
              <label
                key={s.categoryId}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 font-normal ${
                  checked ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="categoryId"
                    value={s.categoryId}
                    checked={checked}
                    onChange={() => toggleService(s.categoryId)}
                  />
                  {s.category.name}
                </span>
                <span className="text-neutral-500">
                  {unitLabel ? `${unitLabel}당 ` : ""}
                  {s.price.toLocaleString()}원~
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {selectedServices.map((service) => (
        <ServiceQuestions
          key={service.categoryId}
          categoryId={service.categoryId}
          categoryName={service.category.name}
          categorySlug={service.category.slug}
          savedAnswers={categoryProfiles[service.category.slug]}
          showName={selectedServices.length > 1}
        />
      ))}

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

      <div className="flex flex-col gap-1 text-sm font-medium">
        <p>
          희망 날짜
          <span className="ml-2 font-normal text-neutral-500">{formatDateLabel(desiredDate)}</span>
        </p>
        <input type="hidden" name="desiredDate" value={desiredDate} />
        <DateCalendarPicker
          value={desiredDate}
          onChange={setDesiredDate}
          minDateStr={todayStr}
          blockedDates={blockedDates}
        />
      </div>

      <div className="flex">
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
      {isDesiredDateBlocked && (
        <p className="text-xs text-red-600">
          해당 날짜는 업체 휴무일이에요. 다른 날짜를 선택해주세요.
        </p>
      )}

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

      <p className="text-xs text-neutral-400">
        예약 시간에 연락 없이 방문하지 않으면 노쇼로 처리될 수 있어요. 취소하실 경우
        업체에 미리 연락해주세요.
      </p>

      {selectedIds.length === 0 && (
        <p className="text-xs text-red-600">청소 종류를 하나 이상 선택해주세요.</p>
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <SubmitButton
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="신청 중..."
        disabled={isDesiredDateBlocked || selectedIds.length === 0}
      >
        예약 신청하기
      </SubmitButton>
    </form>
  );
}

/** One selected service's quote questions (평수, 에어컨 형태/대수, ...).
 * Fields are named "answer_<categoryId>_<key>" so the server action can
 * tell which service each answer belongs to. */
function ServiceQuestions({
  categoryId,
  categoryName,
  categorySlug,
  savedAnswers,
  showName,
}: {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  savedAnswers: Record<string, string> | undefined;
  showName: boolean;
}) {
  const questions = getReservationQuestions(categorySlug);
  if (questions.length === 0) return null;

  const fieldName = (key: string) => `answer_${categoryId}_${key}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3">
      {showName && <p className="text-sm font-semibold">{categoryName}</p>}
      <p className="text-xs text-neutral-500">
        업체가 정확한 견적을 낼 수 있도록 아래 정보를 알려주세요.
      </p>
      {questions.map((q) =>
        q.type === "select" && q.multiple ? (
          <div key={q.key} className="flex flex-col gap-1 text-sm font-medium">
            {q.label} (복수 선택 가능)
            <div className="flex flex-wrap gap-2">
              {q.options?.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-normal"
                >
                  <input
                    type="checkbox"
                    name={fieldName(q.key)}
                    value={option}
                    defaultChecked={(savedAnswers?.[q.key] ?? "").split(",").includes(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ) : q.type === "select" ? (
          <label key={q.key} className="flex flex-col gap-1 text-sm font-medium">
            {q.label}
            <select
              name={fieldName(q.key)}
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
          <label key={q.key} className="flex flex-col gap-1 text-sm font-medium">
            {q.label}
            <input
              name={fieldName(q.key)}
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
  );
}
