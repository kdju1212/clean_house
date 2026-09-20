"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateProfile } from "./actions";
import { BusinessHoursPicker } from "./business-hours-picker";
import { formatPhoneNumber } from "./phone-format";

export function ProfileForm({
  name,
  phone,
  introText,
  businessHours,
  isAvailable,
  websiteUrl,
}: {
  name: string;
  phone: string;
  introText: string;
  businessHours: string;
  isAvailable: boolean;
  websiteUrl: string;
}) {
  const [state, formAction] = useActionState(updateProfile, undefined);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [businessHoursValue, setBusinessHoursValue] = useState(businessHours);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        업체명
        <input
          name="name"
          defaultValue={name}
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        연락처
        <input
          name="phone"
          value={phoneValue}
          onChange={(e) => setPhoneValue(formatPhoneNumber(e.target.value))}
          required
          inputMode="numeric"
          maxLength={13}
          placeholder="010-0000-0000"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        업체 소개
        <textarea
          name="introText"
          defaultValue={introText}
          rows={3}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        영업시간
        <BusinessHoursPicker value={businessHoursValue} onChange={setBusinessHoursValue} />
        <input type="hidden" name="businessHours" value={businessHoursValue} />
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        홈페이지 주소 (선택)
        <input
          name="websiteUrl"
          type="text"
          defaultValue={websiteUrl}
          placeholder="https://example.com"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
        <span className="text-xs font-normal text-neutral-400">
          입력하면 고객이 예약 버튼을 눌렀을 때 우리 사이트 대신 이 주소로 이동해요.
          비워두면 우리 사이트에서 바로 예약을 받아요.
        </span>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isAvailable" defaultChecked={isAvailable} />
        현재 예약 가능
      </label>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton
        className="mt-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        pendingText="저장 중..."
      >
        저장
      </SubmitButton>
    </form>
  );
}
