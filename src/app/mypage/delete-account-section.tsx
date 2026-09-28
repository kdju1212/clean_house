"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { deleteAccount } from "./actions";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [state, formAction] = useActionState(deleteAccount, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-neutral-400 underline"
      >
        회원 탈퇴
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
      <p className="text-xs font-medium text-red-700">
        탈퇴하면 다시 로그인할 수 없고, 진행 중인 예약은 모두 취소돼요.
      </p>
      <p className="mt-1 text-xs text-red-600">
        작성한 리뷰나 이미 완료된 예약 기록은 업체 측 기록 보존을 위해 남아있어요(작성자는
        &ldquo;탈퇴한 회원&rdquo;으로 표시돼요).
      </p>

      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <label className="flex items-start gap-2 text-xs text-red-700">
          <input
            type="checkbox"
            name="confirm"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          위 내용을 확인했고 탈퇴에 동의합니다.
        </label>

        <div className="flex gap-2">
          <SubmitButton
            disabled={!agreed}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
            pendingText="탈퇴 처리 중..."
          >
            탈퇴하기
          </SubmitButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-xs text-neutral-500"
          >
            취소
          </button>
        </div>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
