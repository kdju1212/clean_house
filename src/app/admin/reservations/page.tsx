import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
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

const PAGE_SIZE = 30;

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();

  const { status: rawStatus, page: rawPage } = await searchParams;
  const activeStatus: StatusFilterValue = STATUS_FILTERS.some(
    (f) => f.value === rawStatus
  )
    ? (rawStatus as StatusFilterValue)
    : "";

  // Never trust a raw page number from the client — clamp anything that
  // isn't a positive integer back to page 1 instead of passing it to skip.
  const parsedPage = Number(rawPage);
  const page =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [reservations, statusCounts] = await Promise.all([
    prisma.reservation.findMany({
      where: activeStatus ? { status: activeStatus } : {},
      select: {
        id: true,
        customerName: true,
        desiredDate: true,
        desiredTime: true,
        address: true,
        addressDetail: true,
        price: true,
        status: true,
        company: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.reservation.groupBy({ by: ["status"], _count: true }),
  ]);
  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const totalForFilter = activeStatus ? (countByStatus.get(activeStatus) ?? 0) : totalCount;
  const totalPages = Math.max(1, Math.ceil(totalForFilter / PAGE_SIZE));

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">예약 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">전체 {totalCount}건</p>

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
                <p className="min-w-0 truncate font-medium">
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
                <div className="truncate">
                  {r.address}
                  {r.addressDetail ? ` ${r.addressDetail}` : ""}
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/reservations?${activeStatus ? `status=${activeStatus}&` : ""}page=${page - 1}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600"
            >
              이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-neutral-400">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/reservations?${activeStatus ? `status=${activeStatus}&` : ""}page=${page + 1}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600"
            >
              다음
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
