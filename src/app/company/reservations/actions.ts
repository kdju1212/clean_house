"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/company-auth";
import { transitionReservationForOwner } from "@/lib/company-reservation-service";

type ReservationStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "COMPLETED";

async function transitionStatus(
  formData: FormData,
  from: ReservationStatus,
  to: ReservationStatus
) {
  const session = await requireSession();

  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string") return;

  await transitionReservationForOwner(session.user.id, reservationId, from, to);

  revalidatePath("/company/reservations");
  revalidatePath(`/company/reservations/${reservationId}`);
}

export async function acceptReservation(formData: FormData) {
  await transitionStatus(formData, "REQUESTED", "ACCEPTED");
}

export async function rejectReservation(formData: FormData) {
  await transitionStatus(formData, "REQUESTED", "REJECTED");
}

export async function completeReservation(formData: FormData) {
  await transitionStatus(formData, "ACCEPTED", "COMPLETED");
}
