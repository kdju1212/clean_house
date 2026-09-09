"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createCompany } from "../actions";

export function RegisterForm() {
  const [state, formAction] = useActionState(createCompany, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        업체명
        <input
          name="name"
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        연락처
        <input
          name="phone"
          type="tel"
          required
          placeholder="010-0000-0000"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        업체 소개 (선택)
        <textarea
          name="introText"
          rows={3}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        영업시간 (선택)
        <input
          name="businessHours"
          placeholder="예: 09:00 - 18:00"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <SubmitButton
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="등록 중..."
      >
        등록하기
      </SubmitButton>
    </form>
  );
}
