import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/reservation";
import { SubmitButton } from "@/components/submit-button";
import { cancelReservation } from "../actions";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { company: true, category: true, review: true },
  });

  if (!reservation || reservation.customerId !== session.user.id) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-neutral-400">{reservation.company.name}</p>
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
          <span className="text-neutral-500">업체</span>
          <span className="text-right font-medium">{reservation.company.name}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">서비스</span>
          <span className="text-right">{reservation.category.name}</span>
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
        {reservation.requestNote && (
          <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3">
            <span className="text-neutral-500">요청사항</span>
            <p className="whitespace-pre-wrap">{reservation.requestNote}</p>
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center gap-3">
        <Link
          href={`/reservations/${reservation.id}/chat`}
          className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
        >
          채팅하기
        </Link>
        {(reservation.status === "REQUESTED" ||
          reservation.status === "ACCEPTED") && (
          <form action={cancelReservation}>
            <input type="hidden" name="reservationId" value={reservation.id} />
            <SubmitButton
              className="rounded-lg px-4 py-2 text-sm text-neutral-500 underline"
              pendingText="취소 중..."
            >
              예약 취소
            </SubmitButton>
          </form>
        )}
        {reservation.status === "COMPLETED" &&
          (reservation.review ? (
            <span className="text-sm text-neutral-400">리뷰 작성 완료</span>
          ) : (
            <Link
              href={`/reservations/${reservation.id}/review`}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 underline"
            >
              리뷰 작성
            </Link>
          ))}
      </div>
    </main>
  );
}
