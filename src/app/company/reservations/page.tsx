import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RESERVATION_ITEMS_INCLUDE, reservationServiceNames } from "@/lib/reservation";
import { ReservationsView } from "./reservations-view";

// Needs-action items first, then soonest by desired date.
const STATUS_ORDER: Record<string, number> = {
  REQUESTED: 0,
  ACCEPTED: 1,
  COMPLETED: 2,
  NO_SHOW: 2,
  REJECTED: 3,
  CANCELLED: 3,
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "REQUESTED", label: "신규" },
  { value: "ACCEPTED", label: "승인됨" },
  { value: "COMPLETED", label: "완료" },
  { value: "REJECTED", label: "거절됨" },
  { value: "CANCELLED", label: "취소됨" },
  { value: "NO_SHOW", label: "노쇼" },
] as const;

type ReservationStatusValue = (typeof STATUS_FILTERS)[number]["value"];

export default async function CompanyReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { status: rawStatus } = await searchParams;
  const activeStatus: ReservationStatusValue = STATUS_FILTERS.some(
    (f) => f.value === rawStatus
  )
    ? (rawStatus as ReservationStatusValue)
    : "";

  const company = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
  });

  if (!company) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-lg font-bold">예약 관리</h1>
        <p className="mt-2 text-sm text-neutral-500">
          아직 등록된 업체가 없어요.
        </p>
        <Link
          href="/company/register"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          업체 등록하기
        </Link>
      </main>
    );
  }

  const [reservations, statusCounts] = await Promise.all([
    prisma.reservation.findMany({
      where: { companyId: company.id, ...(activeStatus ? { status: activeStatus } : {}) },
      include: { items: RESERVATION_ITEMS_INCLUDE },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      where: { companyId: company.id },
      _count: true,
    }),
  ]);
  reservations.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  );
  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count, 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">예약 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">{company.name}</p>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const count = f.value ? (countByStatus.get(f.value) ?? 0) : totalCount;
          return (
            <Link
              key={f.value}
              href={f.value ? `/company/reservations?status=${f.value}` : "/company/reservations"}
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

      <ReservationsView
        reservations={reservations.map((r) => ({
          id: r.id,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          status: r.status,
          price: r.price,
          serviceNames: reservationServiceNames(r.items),
          desiredDate: r.desiredDate.toISOString().slice(0, 10),
          desiredTime: r.desiredTime,
          address: r.address,
          addressDetail: r.addressDetail,
        }))}
      />
    </main>
  );
}
