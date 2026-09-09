"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateProfile } from "./actions";

export function ProfileForm({
  name,
  phone,
  introText,
  businessHours,
  isAvailable,
}: {
  name: string;
  phone: string;
  introText: string;
  businessHours: string;
  isAvailable: boolean;
}) {
  const [state, formAction] = useActionState(updateProfile, undefined);

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
          defaultValue={phone}
          required
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
      <label className="flex flex-col gap-1 text-sm font-medium">
        영업시간
        <input
          name="businessHours"
          defaultValue={businessHours}
          placeholder="예: 09:00 - 18:00"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
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
