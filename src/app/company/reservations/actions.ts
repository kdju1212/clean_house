"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwnedCompany, requireSession } from "@/lib/company-auth";

type ReservationStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "COMPLETED";

async function transitionStatus(
  formData: FormData,
  from: ReservationStatus,
  to: ReservationStatus
) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string") return;

  // Scoped to this company's own reservations and the expected current
  // status — a customer/other company can never touch this via a crafted id.
  await prisma.reservation.updateMany({
    where: { id: reservationId, companyId: company.id, status: from },
    data: { status: to },
  });

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
