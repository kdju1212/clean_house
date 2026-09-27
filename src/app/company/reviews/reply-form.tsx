"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { replyToReview, deleteReviewReply } from "./actions";
import type { ActionState } from "@/lib/action-state";

/** Toggles a small inline textarea open on click, same pattern as the admin
 * SuspendCompanyForm — no reply yet shows "답글 달기"; an existing reply
 * shows it with "수정"/"삭제" underneath. */
export function ReplyForm({
  reviewId,
  existingReply,
}: {
  reviewId: string;
  existingReply: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [replyState, replyAction] = useActionState<ActionState, FormData>(replyToReview, undefined);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteReviewReply, undefined);

  if (existingReply && !editing) {
    return (
      <div className="mt-2 rounded-lg bg-blue-50 p-3">
        <p className="text-xs font-semibold text-blue-700">사장님 답글</p>
        <p className="mt-1 text-sm text-neutral-700">{existingReply}</p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-neutral-400 underline"
          >
            수정
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="reviewId" value={reviewId} />
            <SubmitButton className="text-xs text-neutral-400 underline" pendingText="삭제 중...">
              삭제
            </SubmitButton>
          </form>
        </div>
        {deleteState?.error && <p className="mt-1 text-xs text-red-600">{deleteState.error}</p>}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 text-xs font-medium text-blue-600 underline"
      >
        답글 달기
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await replyAction(formData);
        setEditing(false);
      }}
      className="mt-2 flex flex-col gap-2"
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <textarea
        name="reply"
        required
        rows={3}
        defaultValue={existingReply ?? ""}
        placeholder="고객님께 전할 답글을 입력해주세요"
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      />
      {replyState?.error && <p className="text-xs text-red-600">{replyState.error}</p>}
      <div className="flex gap-2">
        <SubmitButton
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
          pendingText="등록 중..."
        >
          등록
        </SubmitButton>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}
