import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of /company/reservations/[id] — full detail including
 * requestNote, scoped to the caller's own company (never another
 * company's reservation, even by guessing an id). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const company = await prisma.company.findUnique({ where: { ownerUserId: userId } });
  if (!company) {
    return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 });
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!reservation || reservation.companyId !== company.id) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    reservation: {
      id: reservation.id,
      status: reservation.status,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      categoryName: reservation.category.name,
      price: reservation.price,
      desiredDate: reservation.desiredDate.toISOString(),
      desiredTime: reservation.desiredTime,
      address: reservation.address,
      addressDetail: reservation.addressDetail,
      requestNote: reservation.requestNote,
    },
  });
}
