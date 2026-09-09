"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updatePhone } from "./actions";

export function PhoneForm({ initialPhone }: { initialPhone: string }) {
  const [state, formAction] = useActionState(updatePhone, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="phone"
          type="tel"
          defaultValue={initialPhone}
          placeholder="010-0000-0000"
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        />
        <SubmitButton
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          pendingText="저장 중..."
        >
          저장
        </SubmitButton>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
