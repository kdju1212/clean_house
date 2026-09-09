"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { cancelReservation } from "./actions";

export function CancelReservationButton({
  reservationId,
  className,
}: {
  reservationId: string;
  className: string;
}) {
  const [state, formAction] = useActionState(cancelReservation, undefined);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="reservationId" value={reservationId} />
      <SubmitButton className={className} pendingText="취소 중...">
        예약 취소
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
