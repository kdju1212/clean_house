import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/reservation";
import { SubmitButton } from "@/components/submit-button";
import { acceptReservation, completeReservation, rejectReservation } from "./actions";

// Needs-action items first, then soonest by desired date.
const STATUS_ORDER: Record<string, number> = {
  REQUESTED: 0,
  ACCEPTED: 1,
  COMPLETED: 2,
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
      include: { category: true },
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

      {reservations.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          아직 들어온 예약이 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reservations.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <Link href={`/company/reservations/${r.id}`} className="block">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{r.customerName}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${RESERVATION_STATUS_BADGE_CLASS[r.status]}`}
                  >
                    {RESERVATION_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <dl className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
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
                  <div>연락처 {r.customerPhone}</div>
                </dl>
              </Link>

              <Link
                href={`/reservations/${r.id}/chat`}
                className="mt-3 inline-block text-xs font-medium text-neutral-600 underline"
              >
                채팅하기
              </Link>

              {r.status === "REQUESTED" && (
                <div className="mt-3 flex gap-2">
                  <form action={acceptReservation}>
                    <input type="hidden" name="reservationId" value={r.id} />
                    <SubmitButton
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                      pendingText="처리 중..."
                    >
                      승인
                    </SubmitButton>
                  </form>
                  <form action={rejectReservation}>
                    <input type="hidden" name="reservationId" value={r.id} />
                    <SubmitButton
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
                      pendingText="처리 중..."
                    >
                      거절
                    </SubmitButton>
                  </form>
                </div>
              )}
              {r.status === "ACCEPTED" && (
                <form action={completeReservation} className="mt-3">
                  <input type="hidden" name="reservationId" value={r.id} />
                  <SubmitButton
                    className="rounded-lg border border-neutral-900 px-3 py-1.5 text-xs font-medium"
                    pendingText="처리 중..."
                  >
                    청소 완료 처리
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
