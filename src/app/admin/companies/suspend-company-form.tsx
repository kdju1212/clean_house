"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { suspendCompany } from "./actions";
import type { ActionState } from "@/lib/action-state";

/** "정지" — unlike approve/reactivate/verify (CompanyStatusForm, one click),
 * this needs a reason: it's shown to the owner (via Notification) and kept
 * on Company.suspendedReason for later reference. Toggles a small inline
 * reason box open on click rather than always showing it, so the company
 * list/detail pages don't grow a textarea per row by default. */
export function SuspendCompanyForm({ companyId, size = "sm" }: { companyId: string; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(suspendCompany, undefined);

  const buttonClass =
    size === "md"
      ? "rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600"
      : "rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        정지
      </button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <textarea
        name="reason"
        required
        rows={2}
        placeholder="정지 사유를 입력해주세요 (업체에 그대로 전달돼요)"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs"
      />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
          pendingText="정지 중..."
        >
          정지 확정
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}
