import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/reservation";
import { SubmitButton } from "@/components/submit-button";
import { cancelReservation } from "./actions";

export default async function MyReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { created } = await searchParams;

  const reservations = await prisma.reservation.findMany({
    where: { customerId: session.user.id },
    include: { company: true, category: true, review: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">내 예약</h1>

      {created && (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          예약 신청이 완료됐어요. 업체가 확인 후 승인하면 알려드려요.
        </p>
      )}

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
                  <form action={cancelReservation}>
                    <input type="hidden" name="reservationId" value={r.id} />
                    <SubmitButton className="text-xs text-neutral-400 underline" pendingText="취소 중...">
                      예약 취소
                    </SubmitButton>
                  </form>
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
