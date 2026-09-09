"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { AD_SLOTS, AD_SLOT_PRICE } from "@/lib/ad";
import { applyAd } from "./actions";
import type { ActionState } from "@/lib/action-state";

export function ApplyAdForm({
  services,
  todayStr,
}: {
  services: { categoryId: string; category: { name: string } }[];
  todayStr: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(applyAd, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        청소 종류
        <select
          name="categoryId"
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        >
          {services.map((s) => (
            <option key={s.categoryId} value={s.categoryId}>
              {s.category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        광고 슬롯
        <select
          name="slot"
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        >
          {AD_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}번 슬롯 ({AD_SLOT_PRICE[slot].toLocaleString()}원/일)
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          시작일
          <input
            name="startDate"
            type="date"
            min={todayStr}
            defaultValue={todayStr}
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          종료일
          <input
            name="endDate"
            type="date"
            min={todayStr}
            defaultValue={todayStr}
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>
      </div>
      <SubmitButton
        className="mt-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        pendingText="신청 중..."
      >
        광고 신청
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
