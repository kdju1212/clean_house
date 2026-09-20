"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { addBlockedDate } from "./actions";
import type { ActionState } from "@/lib/action-state";

export function AddBlockedDateForm({ todayStr }: { todayStr: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(addBlockedDate, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="date"
          type="date"
          min={todayStr}
          defaultValue={todayStr}
          required
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        />
        <SubmitButton
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          pendingText="추가 중..."
        >
          휴무일 추가
        </SubmitButton>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
