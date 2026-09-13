import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import type { ReservationStatus } from "@/generated/prisma/client";

const VALID_STATUSES: ReservationStatus[] = [
  "REQUESTED",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

/** Mobile equivalent of /company/reservations — same "needs-action first"
 * ordering and per-company scoping (never another company's bookings). */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const company = await prisma.company.findUnique({ where: { ownerUserId: userId } });
  if (!company) {
    return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as ReservationStatus)
    ? (statusParam as ReservationStatus)
    : undefined;

  const reservations = await prisma.reservation.findMany({
    where: { companyId: company.id, ...(status ? { status } : {}) },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const statusOrder: Record<ReservationStatus, number> = {
    REQUESTED: 0,
    ACCEPTED: 1,
    COMPLETED: 2,
    REJECTED: 3,
    CANCELLED: 3,
  };
  reservations.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      id: r.id,
      status: r.status,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      categoryName: r.category.name,
      price: r.price,
      desiredDate: r.desiredDate.toISOString(),
      desiredTime: r.desiredTime,
      address: r.address,
      addressDetail: r.addressDetail,
    })),
  });
}
