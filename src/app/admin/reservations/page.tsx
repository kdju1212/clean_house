import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/reservation";

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "REQUESTED", label: "신청" },
  { value: "ACCEPTED", label: "확정" },
  { value: "COMPLETED", label: "완료" },
  { value: "REJECTED", label: "거절" },
  { value: "CANCELLED", label: "취소" },
] as const;

type StatusFilterValue = (typeof STATUS_FILTERS)[number]["value"];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const activeStatus: StatusFilterValue = STATUS_FILTERS.some(
    (f) => f.value === rawStatus
  )
    ? (rawStatus as StatusFilterValue)
    : "";

  const [reservations, statusCounts] = await Promise.all([
    prisma.reservation.findMany({
      where: activeStatus ? { status: activeStatus } : {},
      include: { company: true, customer: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.reservation.groupBy({ by: ["status"], _count: true }),
  ]);
  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">예약 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">
        전체 {totalCount}건 (최근 200건까지 표시)
      </p>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const count = f.value ? (countByStatus.get(f.value) ?? 0) : totalCount;
          return (
            <Link
              key={f.value}
              href={f.value ? `/admin/reservations?status=${f.value}` : "/admin/reservations"}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeStatus === f.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              {f.label} {count}
            </Link>
          );
        })}
      </div>

      {reservations.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          해당하는 예약이 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {reservations.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">
                  {r.company.name} ← {r.customerName}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${RESERVATION_STATUS_BADGE_CLASS[r.status]}`}
                >
                  {RESERVATION_STATUS_LABEL[r.status]}
                </span>
              </div>
              <dl className="mt-1 flex flex-col gap-0.5 text-xs text-neutral-500">
                <div>
                  {r.category.name}
                  {r.price ? ` · ${r.price.toLocaleString()}원` : ""}
                </div>
                <div>
                  {r.desiredDate.toLocaleDateString("ko-KR")} {r.desiredTime}
                </div>
                <div>
                  {r.address}
                  {r.addressDetail ? ` ${r.addressDetail}` : ""}
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
