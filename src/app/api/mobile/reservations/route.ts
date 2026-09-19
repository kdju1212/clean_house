import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { createReservationForCustomer } from "@/lib/reservation-service";
import type { ReservationStatus } from "@/generated/prisma/client";

const STATUS_GROUPS: Record<string, ReservationStatus[]> = {
  REQUESTED: ["REQUESTED"],
  ACCEPTED: ["ACCEPTED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["REJECTED", "CANCELLED"],
};

/** Mobile equivalent of the web /reservations list — same status grouping,
 * so the app's filter chips can mirror the web ones 1:1. */
export async function GET(request: Request) {
  const customerId = await getMobileUserId(request);
  if (!customerId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const statuses = statusParam ? STATUS_GROUPS[statusParam] : undefined;

  const reservations = await prisma.reservation.findMany({
    where: {
      customerId,
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: { company: true, category: true, review: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      id: r.id,
      status: r.status,
      companyId: r.companyId,
      companyName: r.company.name,
      categoryName: r.category.name,
      price: r.price,
      desiredDate: r.desiredDate.toISOString(),
      desiredTime: r.desiredTime,
      address: r.address,
      addressDetail: r.addressDetail,
      hasReview: Boolean(r.review),
    })),
  });
}

/**
 * Mobile equivalent of the web createReservation Server Action — same
 * shared core (src/lib/reservation-service.ts), so validation and the
 * region-eligibility re-check behave identically. The only real difference
 * from the web flow: there's no REGION_COOKIE here, so the app must send
 * the customer's selected regionId explicitly in the body.
 */
export async function POST(request: Request) {
  const customerId = await getMobileUserId(request);
  if (!customerId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const customerRegionId = (body as Record<string, unknown>).regionId;
  if (typeof customerRegionId !== "string" || customerRegionId.length === 0) {
    return NextResponse.json({ error: "지역을 먼저 선택해주세요." }, { status: 400 });
  }

  try {
    const reservationId = await createReservationForCustomer({
      customerId,
      customerRegionId,
      companyId: (body as Record<string, unknown>).companyId,
      categoryId: (body as Record<string, unknown>).categoryId,
      name: (body as Record<string, unknown>).name,
      phone: (body as Record<string, unknown>).phone,
      address: (body as Record<string, unknown>).address,
      addressDetail: (body as Record<string, unknown>).addressDetail,
      desiredDateRaw: (body as Record<string, unknown>).desiredDate,
      desiredTime: (body as Record<string, unknown>).desiredTime,
      requestNote: (body as Record<string, unknown>).requestNote,
      categoryAnswers: (body as Record<string, unknown>).categoryAnswers,
    });
    return NextResponse.json({ reservationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "예약 신청에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
