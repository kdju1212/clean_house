"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { createReservationForCustomer } from "@/lib/reservation-service";
import { createNotification } from "@/lib/notification";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function createReservation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let reservationId: string;

  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("로그인이 필요합니다.");
    }

    // The web app tracks the customer's region via a cookie (no per-request
    // field for it); the mobile API takes it explicitly in the body instead
    // — see src/app/api/mobile/reservations/route.ts.
    const customerRegion = await getSelectedRegion();
    if (!customerRegion) {
      throw new Error("지역을 먼저 선택해주세요.");
    }

    // The dynamic per-category question fields are named "answer_<key>" in
    // the form (see new-reservation-form.tsx) since FormData has no native
    // nested-object field — reassembled into a plain object here.
    const categoryAnswers: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("answer_")) {
        categoryAnswers[key.slice("answer_".length)] = value;
      }
    }

    reservationId = await createReservationForCustomer({
      customerId: session.user.id,
      customerRegionId: customerRegion.id,
      companyId: formData.get("companyId"),
      categoryId: formData.get("categoryId"),
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      addressDetail: formData.get("addressDetail"),
      desiredDateRaw: formData.get("desiredDate"),
      desiredTime: formData.get("desiredTime"),
      requestNote: formData.get("requestNote"),
      categoryAnswers,
    });
  } catch (err) {
    return toActionError(err);
  }

  redirect(`/reservations?created=${reservationId}`);
}

export async function cancelReservation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("로그인이 필요합니다.");
    }

    const reservationId = formData.get("reservationId");
    if (typeof reservationId !== "string") return;

    // Scoped to the caller's own reservation and only from a cancellable
    // state — an already-completed/rejected/cancelled booking can't change.
    const result = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        customerId: session.user.id,
        status: { in: ["REQUESTED", "ACCEPTED"] },
      },
      data: { status: "CANCELLED" },
    });

    if (result.count > 0) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { company: true, category: true },
      });
      if (reservation) {
        await createNotification({
          userId: reservation.company.ownerUserId,
          type: "RESERVATION_CANCELLED",
          title: "예약이 취소됐어요",
          body: `${reservation.customerName}님이 ${reservation.category.name} 예약을 취소했어요.`,
          link: `/company/reservations/${reservation.id}`,
        });
      }
    }

    revalidatePath("/reservations");
    revalidatePath(`/reservations/${reservationId}`);
  } catch (err) {
    return toActionError(err);
  }
}
