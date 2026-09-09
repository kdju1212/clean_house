"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { selectRegion } from "./actions";

export function RegionSelectForm({
  regions,
  selectedId,
}: {
  regions: { id: string; name: string }[];
  selectedId?: string;
}) {
  const [state, formAction] = useActionState(selectRegion, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-2">
      {regions.map((region) => (
        <label
          key={region.id}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm has-checked:border-neutral-900"
        >
          <input
            type="radio"
            name="regionId"
            value={region.id}
            defaultChecked={region.id === selectedId}
          />
          {region.name}
        </label>
      ))}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="저장 중..."
      >
        선택 완료
      </SubmitButton>
    </form>
  );
}
