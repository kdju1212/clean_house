"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { getPricingQuantityKey, PRICING_UNIT_LABEL } from "@/lib/reservation-questions";
import { addService } from "./actions";

export function AddServiceForm({
  categories,
  usedCategoryIds,
}: {
  categories: { id: string; slug: string; name: string }[];
  usedCategoryIds: Set<string>;
}) {
  const [state, formAction] = useActionState(addService, undefined);
  const [categoryId, setCategoryId] = useState("");

  const selectedSlug = categories.find((c) => c.id === categoryId)?.slug;
  const quantityKey = selectedSlug ? getPricingQuantityKey(selectedSlug) : undefined;
  const unitLabel = quantityKey ? PRICING_UNIT_LABEL[quantityKey] : null;

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

      {unitLabel && (
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="pricingUnit" value="FLAT" defaultChecked />
            고정가
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="pricingUnit" value="PER_UNIT" />
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
        placeholder={unitLabel ? `가격 (원) — 고정가 또는 ${unitLabel}당 단가` : "가격 (원)"}
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      />
      <input
        name="description"
        placeholder="설명 (선택, 예: 25평 기준)"
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      />
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
