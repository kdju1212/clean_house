"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/company-auth";
import { transitionReservationForOwner } from "@/lib/company-reservation-service";
import { addBlockedDateForOwner, removeBlockedDateForOwner } from "@/lib/company-schedule-service";

type ReservationStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "NO_SHOW";

async function transitionStatus(
  formData: FormData,
  from: ReservationStatus,
  to: ReservationStatus,
  price?: number
) {
  const session = await requireSession();

  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string") return;

  await transitionReservationForOwner(session.user.id, reservationId, from, to, price);

  revalidatePath("/company/reservations");
  revalidatePath(`/company/reservations/${reservationId}`);
}

export async function acceptReservation(formData: FormData) {
  const priceRaw = formData.get("price");
  const price = typeof priceRaw === "string" && priceRaw.trim() !== "" ? Number(priceRaw) : undefined;
  await transitionStatus(formData, "REQUESTED", "ACCEPTED", price);
}

export async function rejectReservation(formData: FormData) {
  await transitionStatus(formData, "REQUESTED", "REJECTED");
}

export async function completeReservation(formData: FormData) {
  await transitionStatus(formData, "ACCEPTED", "COMPLETED");
}

export async function markNoShowReservation(formData: FormData) {
  await transitionStatus(formData, "ACCEPTED", "NO_SHOW");
}

/** Calendar "휴무로 설정 / 휴무 해제" toggle — returns an error message
 * instead of throwing so the calendar can show it inline. */
export async function setBlockedDate(
  date: string,
  blocked: boolean
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    if (blocked) {
      await addBlockedDateForOwner(session.user.id, date);
    } else {
      await removeBlockedDateForOwner(session.user.id, date);
    }
    revalidatePath("/company/reservations");
    revalidatePath("/company/schedule");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "저장에 실패했어요." };
  }
}
