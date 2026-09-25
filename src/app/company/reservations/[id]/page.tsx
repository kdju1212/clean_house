import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
  RESERVATION_ITEMS_INCLUDE,
  reservationServiceNames,
} from "@/lib/reservation";
import { ReservationEstimateDetails } from "@/components/reservation-estimate-details";
import { SubmitButton } from "@/components/submit-button";
import {
  acceptReservation,
  completeReservation,
  markNoShowReservation,
  rejectReservation,
} from "../actions";

export default async function CompanyReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
  });
  if (!company) {
    redirect("/company/reservations");
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { items: RESERVATION_ITEMS_INCLUDE },
  });

  if (!reservation || reservation.companyId !== company.id) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-neutral-400">{company.name}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">예약 상세</h1>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${RESERVATION_STATUS_BADGE_CLASS[reservation.status]}`}
        >
          {RESERVATION_STATUS_LABEL[reservation.status]}
        </span>
      </div>

      <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">고객</span>
          <span className="text-right font-medium">{reservation.customerName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">연락처</span>
          <span className="text-right">{reservation.customerPhone}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">서비스</span>
          <span className="text-right">{reservationServiceNames(reservation.items)}</span>
        </div>
        {reservation.price != null && (
          <div className="flex justify-between gap-3">
            <span className="text-neutral-500">가격</span>
            <span className="text-right font-semibold">
              {reservation.price.toLocaleString()}원
            </span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">날짜/시간</span>
          <span className="text-right">
            {reservation.desiredDate.toLocaleDateString("ko-KR")}{" "}
            {reservation.desiredTime}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">주소</span>
          <span className="text-right">
            {reservation.address}
            {reservation.addressDetail ? ` ${reservation.addressDetail}` : ""}
          </span>
        </div>
        <ReservationEstimateDetails items={reservation.items} />
        {reservation.requestNote && (
          <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3">
            <span className="text-neutral-500">요청사항</span>
            <p className="whitespace-pre-wrap">{reservation.requestNote}</p>
          </div>
        )}
      </section>

      {reservation.status === "REQUESTED" && (
        <p className="mt-4 text-xs text-neutral-500">
          견적 정보를 확인하고 실제 가격에 맞게 조정한 다음 승인해주세요.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link
          href={`/reservations/${reservation.id}/chat`}
          className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
        >
          채팅하기
        </Link>

        {reservation.status === "REQUESTED" && (
          <>
            <form action={acceptReservation} className="flex items-center gap-2">
              <input type="hidden" name="reservationId" value={reservation.id} />
              <input
                type="number"
                name="price"
                min={0}
                step={1000}
                defaultValue={reservation.price ?? undefined}
                placeholder="가격"
                className="w-28 rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              />
              <SubmitButton
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                pendingText="처리 중..."
              >
                승인
              </SubmitButton>
            </form>
            <form action={rejectReservation}>
              <input type="hidden" name="reservationId" value={reservation.id} />
              <SubmitButton
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600"
                pendingText="처리 중..."
              >
                거절
              </SubmitButton>
            </form>
          </>
        )}
        {reservation.status === "ACCEPTED" && (
          <>
            <form action={completeReservation}>
              <input type="hidden" name="reservationId" value={reservation.id} />
              <SubmitButton
                className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
                pendingText="처리 중..."
              >
                청소 완료 처리
              </SubmitButton>
            </form>
            <form action={markNoShowReservation}>
              <input type="hidden" name="reservationId" value={reservation.id} />
              <SubmitButton
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600"
                pendingText="처리 중..."
              >
                노쇼 처리
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
