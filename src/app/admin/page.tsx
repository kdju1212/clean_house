import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [pendingCompanies, pendingReports, requestedReservations, totalUsers] =
    await Promise.all([
      prisma.company.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.reservation.count({ where: { status: "REQUESTED" } }),
      prisma.user.count(),
    ]);

  const cards = [
    {
      href: "/admin/companies?status=PENDING",
      label: "승인 대기 업체",
      value: pendingCompanies,
      highlight: pendingCompanies > 0,
    },
    {
      href: "/admin/reports",
      label: "처리 대기 신고",
      value: pendingReports,
      highlight: pendingReports > 0,
    },
    {
      href: "/admin/reservations?status=REQUESTED",
      label: "신청 중인 예약",
      value: requestedReservations,
      highlight: false,
    },
    {
      href: "/admin/users",
      label: "전체 사용자",
      value: totalUsers,
      highlight: false,
    },
  ];

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">관리자 대시보드</h1>
      <p className="mt-1 text-sm text-neutral-500">
        업체 승인, 신고 리뷰, 사용자, 예약을 한곳에서 확인하세요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-neutral-200 bg-white p-4"
          >
            <p
              className={`text-2xl font-bold ${card.highlight ? "text-amber-600" : "text-neutral-900"}`}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
