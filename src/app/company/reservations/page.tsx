import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservation";
import { acceptReservation, completeReservation, rejectReservation } from "./actions";

const STATUS_BADGE_CLASS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-neutral-200 text-neutral-600",
  CANCELLED: "bg-neutral-200 text-neutral-600",
  COMPLETED: "bg-blue-100 text-blue-700",
};

// Needs-action items first, then soonest by desired date.
const STATUS_ORDER: Record<string, number> = {
  REQUESTED: 0,
  ACCEPTED: 1,
  COMPLETED: 2,
  REJECTED: 3,
  CANCELLED: 3,
};

export default async function CompanyReservationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

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

  const reservations = await prisma.reservation.findMany({
    where: { companyId: company.id },
    include: { category: true },
    orderBy: [{ createdAt: "desc" }],
  });
  reservations.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">예약 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">{company.name}</p>

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
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{r.customerName}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[r.status]}`}
                >
                  {RESERVATION_STATUS_LABEL[r.status]}
                </span>
              </div>
              <dl className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
                <div>{r.category.name}</div>
                <div>
                  {r.desiredDate.toLocaleDateString("ko-KR")} {r.desiredTime}
                </div>
                <div>
                  {r.address}
                  {r.addressDetail ? ` ${r.addressDetail}` : ""}
                </div>
                <div>연락처 {r.customerPhone}</div>
              </dl>

              {r.status === "REQUESTED" && (
                <div className="mt-3 flex gap-2">
                  <form action={acceptReservation}>
                    <input type="hidden" name="reservationId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      승인
                    </button>
                  </form>
                  <form action={rejectReservation}>
                    <input type="hidden" name="reservationId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
                    >
                      거절
                    </button>
                  </form>
                </div>
              )}
              {r.status === "ACCEPTED" && (
                <form action={completeReservation} className="mt-3">
                  <input type="hidden" name="reservationId" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-900 px-3 py-1.5 text-xs font-medium"
                  >
                    청소 완료 처리
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
