"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { resolveReport } from "./actions";
import type { ActionState } from "@/lib/action-state";

const STYLE: Record<"hide" | "dismiss", string> = {
  hide: "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white",
  dismiss:
    "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600",
};

const LABEL: Record<"hide" | "dismiss", string> = {
  hide: "리뷰 숨기기",
  dismiss: "반려",
};

export function ResolveReportForm({
  reportId,
  action,
}: {
  reportId: string;
  action: "hide" | "dismiss";
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resolveReport,
    undefined
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton className={STYLE[action]} pendingText="처리 중...">
        {LABEL[action]}
      </SubmitButton>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
