import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/reservation";
import { CancelReservationButton } from "./cancel-reservation-button";

const STATUS_FILTERS = [
  { value: "", label: "전체", statuses: [] as const },
  { value: "REQUESTED", label: "예약 예정", statuses: ["REQUESTED"] as const },
  { value: "ACCEPTED", label: "진행 중", statuses: ["ACCEPTED"] as const },
  { value: "COMPLETED", label: "완료", statuses: ["COMPLETED"] as const },
  { value: "CANCELLED", label: "거절/취소", statuses: ["REJECTED", "CANCELLED"] as const },
] as const;

type StatusFilterValue = (typeof STATUS_FILTERS)[number]["value"];

export default async function MyReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { created, status: rawStatus } = await searchParams;
  const activeStatus: StatusFilterValue = STATUS_FILTERS.some(
    (f) => f.value === rawStatus
  )
    ? (rawStatus as StatusFilterValue)
    : "";
  const activeFilter = STATUS_FILTERS.find((f) => f.value === activeStatus)!;

  const [reservations, statusCounts] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        customerId: session.user.id,
        ...(activeFilter.statuses.length > 0
          ? { status: { in: [...activeFilter.statuses] } }
          : {}),
      },
      include: { company: true, category: true, review: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      where: { customerId: session.user.id },
      _count: true,
    }),
  ]);
  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count, 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">내 예약</h1>

      {created && (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          예약 신청이 완료됐어요. 업체가 확인 후 승인하면 알려드려요.
        </p>
      )}

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.statuses.length === 0
              ? totalCount
              : f.statuses.reduce((sum, s) => sum + (countByStatus.get(s) ?? 0), 0);
          return (
            <Link
              key={f.value}
              href={f.value ? `/reservations?status=${f.value}` : "/reservations"}
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
          아직 예약 내역이 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reservations.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <Link href={`/reservations/${r.id}`} className="block">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{r.company.name}</p>
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
                </dl>
              </Link>

              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={`/reservations/${r.id}/chat`}
                  className="text-xs font-medium text-neutral-600 underline"
                >
                  채팅하기
                </Link>
                {(r.status === "REQUESTED" || r.status === "ACCEPTED") && (
                  <CancelReservationButton
                    reservationId={r.id}
                    className="text-xs text-neutral-400 underline"
                  />
                )}
                {r.status === "COMPLETED" &&
                  (r.review ? (
                    <span className="text-xs text-neutral-400">
                      리뷰 작성 완료
                    </span>
                  ) : (
                    <Link
                      href={`/reservations/${r.id}/review`}
                      className="text-xs font-medium text-neutral-600 underline"
                    >
                      리뷰 작성
                    </Link>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
