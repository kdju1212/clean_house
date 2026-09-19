"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  getPricingQuantityKey,
  getReservationQuestions,
  PRICING_UNIT_LABEL,
} from "@/lib/reservation-questions";
import { addService } from "./actions";

type ExistingService = {
  price: number;
  description: string | null;
  pricingUnit: "FLAT" | "PER_UNIT";
  // Missing key = no restriction for that question (supports every
  // option) — see addServiceForOwner.
  supportedOptions: Record<string, string[]> | null;
};

export function AddServiceForm({
  categories,
  usedCategoryIds,
  existingServices = {},
}: {
  categories: { id: string; slug: string; name: string }[];
  usedCategoryIds: Set<string>;
  // Keyed by categoryId — lets re-selecting an already-registered category
  // pre-fill its current price/설명/지원 형태 instead of resetting them
  // (a company that already restricted 형태 shouldn't lose that just from
  // touching the price).
  existingServices?: Record<string, ExistingService>;
}) {
  const [state, formAction] = useActionState(addService, undefined);
  const [categoryId, setCategoryId] = useState("");

  const selectedSlug = categories.find((c) => c.id === categoryId)?.slug;
  const quantityKey = selectedSlug ? getPricingQuantityKey(selectedSlug) : undefined;
  const unitLabel = quantityKey ? PRICING_UNIT_LABEL[quantityKey] : null;
  const selectQuestions = selectedSlug
    ? getReservationQuestions(selectedSlug).filter((q) => q.type === "select" && q.options)
    : [];
  const existing = existingServices[categoryId];

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <select
        name="categoryId"
        required
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      >
        <option value="">청소 종류 선택</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {usedCategoryIds.has(c.id) ? " (등록됨 · 가격 수정)" : ""}
          </option>
        ))}
      </select>

      {/* Keyed by category so switching selection remounts these fields
          with fresh defaultValue/defaultChecked instead of keeping
          whatever was typed for the previously-selected category. */}
      <div key={categoryId} className="flex flex-col gap-2">
        {unitLabel && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="pricingUnit"
                value="FLAT"
                defaultChecked={(existing?.pricingUnit ?? "FLAT") === "FLAT"}
              />
              고정가
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="pricingUnit"
                value="PER_UNIT"
                defaultChecked={existing?.pricingUnit === "PER_UNIT"}
              />
              {unitLabel}당 단가
            </label>
          </div>
        )}

        <input
          name="price"
          type="number"
          min={0}
          step={1000}
          required
          defaultValue={existing?.price ?? ""}
          placeholder={unitLabel ? `가격 (원) — 고정가 또는 ${unitLabel}당 단가` : "가격 (원)"}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        />
        <input
          name="description"
          defaultValue={existing?.description ?? ""}
          placeholder="설명 (선택, 예: 25평 기준)"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        />

        {selectQuestions.map((q) => (
          <div key={q.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">처리 가능한 {q.label}</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {q.options?.map((option) => {
                // No saved restriction for this question (new service, one
                // added before this feature existed, or a key the company
                // never narrowed) defaults to every option checked —
                // "제한 없음" is the same as "다 할 수 있어요".
                const restricted = existing?.supportedOptions?.[q.key];
                const checked = restricted ? restricted.includes(option) : true;
                return (
                  <label key={option} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name={`supported_${q.key}`}
                      value={option}
                      defaultChecked={checked}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton
        className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
        pendingText="저장 중..."
      >
        추가 / 수정
      </SubmitButton>
    </form>
  );
}
