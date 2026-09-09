"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { approveCompany, reactivateCompany, suspendCompany } from "./actions";
import type { ActionState } from "@/lib/action-state";

const ACTIONS = {
  approve: approveCompany,
  suspend: suspendCompany,
  reactivate: reactivateCompany,
} as const;

const STYLE: Record<keyof typeof ACTIONS, string> = {
  approve: "rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white",
  suspend: "rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600",
  reactivate: "rounded-lg border border-neutral-900 px-3 py-1.5 text-xs font-medium",
};

const LABEL: Record<keyof typeof ACTIONS, string> = {
  approve: "승인",
  suspend: "비활성화",
  reactivate: "재활성화",
};

export function CompanyStatusForm({
  companyId,
  action,
  size = "sm",
}: {
  companyId: string;
  action: keyof typeof ACTIONS;
  size?: "sm" | "md";
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    ACTIONS[action],
    undefined
  );
  const className =
    size === "md" ? STYLE[action].replace("py-1.5 text-xs", "py-2 text-sm") : STYLE[action];

  return (
    <form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <SubmitButton className={className} pendingText="처리 중...">
        {LABEL[action]}
      </SubmitButton>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
