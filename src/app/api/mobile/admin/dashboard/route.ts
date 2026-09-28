import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the web /admin dashboard's stat cards. */
export async function GET(request: Request) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const [pendingCompanies, pendingReports, requestedReservations, totalUsers, unreadSupportMessages] =
    await Promise.all([
      prisma.company.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.reservation.count({ where: { status: "REQUESTED" } }),
      prisma.user.count(),
      prisma.supportMessage.count({ where: { isRead: false, sender: { role: { not: "ADMIN" } } } }),
    ]);

  return NextResponse.json({
    pendingCompanies,
    pendingReports,
    requestedReservations,
    totalUsers,
    unreadSupportMessages,
  });
}
