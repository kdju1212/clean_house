"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { reportReview } from "./actions";

export function ReportForm({ reviewId }: { reviewId: string }) {
  const [state, formAction] = useActionState(reportReview, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <textarea
        name="reason"
        required
        rows={4}
        placeholder="신고 사유를 알려주세요"
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton
        className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="접수 중..."
      >
        신고하기
      </SubmitButton>
    </form>
  );
}
