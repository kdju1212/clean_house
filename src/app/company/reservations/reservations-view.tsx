"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  RESERVATION_STATUS_BADGE_CLASS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/reservation";
import { SubmitButton } from "@/components/submit-button";
import { completeReservation, markNoShowReservation, rejectReservation } from "./actions";

export type ReservationListItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  status: keyof typeof RESERVATION_STATUS_LABEL;
  price: number | null;
  serviceNames: string;
  /** "YYYY-MM-DD" */
  desiredDate: string;
  desiredTime: string;
  address: string;
  addressDetail: string | null;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * The existing status-filtered list, unchanged, plus a new calendar view the
 * owner can switch to — same reservations, same actions, just grouped by
 * desiredDate on a month grid instead of one flat list. Both views share
 * ReservationCard so accept/reject/complete/no-show work identically in
 * either one.
 */
export function ReservationsView({ reservations }: { reservations: ReservationListItem[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <>
      <div className="mt-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            view === "list"
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600"
          }`}
        >
          리스트
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            view === "calendar"
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600"
          }`}
        >
          캘린더
        </button>
      </div>

      {view === "list" ? (
        <ReservationList reservations={reservations} />
      ) : (
        <ReservationCalendar reservations={reservations} />
      )}
    </>
  );
}

function ReservationList({ reservations }: { reservations: ReservationListItem[] }) {
  if (reservations.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-neutral-400">
        아직 들어온 예약이 없어요.
      </p>
    );
  }
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {reservations.map((r) => (
        <ReservationCard key={r.id} reservation={r} />
      ))}
    </ul>
  );
}

function ReservationCard({ reservation: r }: { reservation: ReservationListItem }) {
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4">
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
            {r.serviceNames}
            {r.price ? ` · ${r.price.toLocaleString()}원` : ""}
          </div>
          <div>
            {new Date(`${r.desiredDate}T00:00:00`).toLocaleDateString("ko-KR")} {r.desiredTime}
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
          <Link
            href={`/company/reservations/${r.id}`}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            견적 확인 후 승인
          </Link>
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
        <div className="mt-3 flex gap-2">
          <form action={completeReservation}>
            <input type="hidden" name="reservationId" value={r.id} />
            <SubmitButton
              className="rounded-lg border border-neutral-900 px-3 py-1.5 text-xs font-medium"
              pendingText="처리 중..."
            >
              청소 완료 처리
            </SubmitButton>
          </form>
          <form action={markNoShowReservation}>
            <input type="hidden" name="reservationId" value={r.id} />
            <SubmitButton
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
              pendingText="처리 중..."
            >
              노쇼 처리
            </SubmitButton>
          </form>
        </div>
      )}
    </li>
  );
}

function ReservationCalendar({ reservations }: { reservations: ReservationListItem[] }) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const byDate = useMemo(() => {
    const map = new Map<string, ReservationListItem[]>();
    for (const r of reservations) {
      const list = map.get(r.desiredDate) ?? [];
      list.push(r);
      map.set(r.desiredDate, list);
    }
    return map;
  }, [reservations]);

  const { year, month } = monthCursor;
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonthCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  const selectedReservations = (byDate.get(selectedDate) ?? []).sort((a, b) =>
    a.desiredTime.localeCompare(b.desiredTime)
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
          className="px-2 py-1 text-lg text-neutral-400"
        >
          ‹
        </button>
        <p className="text-sm font-semibold">
          {year}년 {month + 1}월
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
          className="px-2 py-1 text-lg text-neutral-400"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-neutral-400">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;
          const dayReservations = byDate.get(dateStr) ?? [];
          const needsAction = dayReservations.some((r) => r.status === "REQUESTED");
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs ${
                isSelected
                  ? "bg-neutral-900 text-white"
                  : isToday
                    ? "bg-neutral-100 font-semibold text-neutral-900"
                    : "text-neutral-700"
              }`}
            >
              <span>{Number(dateStr.slice(-2))}</span>
              {dayReservations.length > 0 && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-white" : needsAction ? "bg-amber-500" : "bg-neutral-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold text-neutral-500">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
          {selectedReservations.length > 0 ? ` · ${selectedReservations.length}건` : ""}
        </p>
        {selectedReservations.length === 0 ? (
          <p className="mt-3 text-center text-sm text-neutral-400">이 날짜엔 예약이 없어요.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {selectedReservations.map((r) => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
