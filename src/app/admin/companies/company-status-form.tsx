"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  approveCompany,
  reactivateCompany,
  unverifyCompany,
  verifyCompany,
} from "./actions";
import type { ActionState } from "@/lib/action-state";

// "suspend" (정지) isn't here — it needs a reason, see SuspendCompanyForm.
const ACTIONS = {
  approve: approveCompany,
  reactivate: reactivateCompany,
  verify: verifyCompany,
  unverify: unverifyCompany,
} as const;

const STYLE: Record<keyof typeof ACTIONS, string> = {
  approve: "rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white",
  reactivate: "rounded-lg border border-neutral-900 px-3 py-1.5 text-xs font-medium",
  verify: "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white",
  unverify: "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600",
};

const LABEL: Record<keyof typeof ACTIONS, string> = {
  approve: "승인",
  reactivate: "정지 해제",
  verify: "인증하기",
  unverify: "인증 해제",
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
