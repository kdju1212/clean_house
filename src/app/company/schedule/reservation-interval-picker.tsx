"use client";

import { useState, useTransition } from "react";
import {
  setCrewCount,
  setCustomTimeSlots,
  setReservationInterval,
  setSameDayCutoff,
} from "./actions";

const CREW_COUNTS = [1, 2, 3, 4, 5] as const;

const INTERVAL_OPTIONS = [
  { hours: 1, label: "1시간", desc: "바로 다음 시간부터 예약 가능" },
  { hours: 2, label: "2시간", desc: "한 시간 건너뛰고 예약 가능" },
] as const;

/** "동시에 몇 팀까지 예약받을 수 있나요" — a company with 여러 팀 can take
 * that many bookings for the same time slot before it's actually full,
 * instead of the exact time immediately blocking every other customer. */
export function CrewCountPicker({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(count: number) {
    if (count === value) return;
    const previous = value;
    setValue(count);
    setError(null);
    startTransition(async () => {
      const result = await setCrewCount(count);
      if (result.error) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <p className="text-xs font-semibold text-neutral-700">동시 예약 가능 팀 수</p>
      <div className="mt-2 flex gap-1.5">
        {CREW_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => choose(count)}
            disabled={pending}
            aria-pressed={value === count}
            className={`h-9 flex-1 rounded-lg border text-sm font-medium disabled:opacity-60 ${
              value === count
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600"
            }`}
          >
            {count}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">
        {value > 1
          ? `같은 시간대에 최대 ${value}팀까지 예약을 받을 수 있어요. 그 시간이 ${value}건 다 차야 다른 고객에게 막혀요.`
          : "혼자(또는 한 팀만) 운영 중이라 같은 시간에는 한 건만 받을 수 있어요."}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** "예약 텀" — how many hours one visit occupies, so the next booking can't
 * land before a crew is realistically free. E.g. 2시간 텀으로 13시에 예약이
 * 들어오면 14시는 막히고 15시부터 다시 예약할 수 있어요. */
export function ReservationIntervalPicker({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(hours: number) {
    if (hours === value) return;
    const previous = value;
    setValue(hours);
    setError(null);
    startTransition(async () => {
      const result = await setReservationInterval(hours);
      if (result.error) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <p className="text-xs font-semibold text-neutral-700">청소 한 건당 소요 시간</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {INTERVAL_OPTIONS.map((opt) => (
          <button
            key={opt.hours}
            type="button"
            onClick={() => choose(opt.hours)}
            disabled={pending}
            aria-pressed={value === opt.hours}
            className={`rounded-lg border px-3 py-2.5 text-left disabled:opacity-60 ${
              value === opt.hours
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-200"
            }`}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
            <span className="mt-0.5 block text-xs text-neutral-500">{opt.desc}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">
        한 팀이 한 건을 맡으면 몇 시간짜리 일감인지에 맞춰서, 그 시간 동안은
        같은 팀 몫의 예약이 안 들어오게 해요. 예: 2시간으로 하면 13시 예약이
        있을 때 14시는 막히고 15시부터 다시 예약할 수 있어요.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Business hours can run as late as 23:00 (see BusinessHoursPicker's HOURS),
// so the cutoff choices need to reach at least that far too.
const CUTOFF_OPTIONS = [
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

/** "당일 예약 마감시간" — after this clock time, today stops accepting new
 * bookings for any remaining slot (not just ones already in the past).
 * "마감 없음" keeps same-day booking open until each slot's own time passes. */
export function SameDayCutoffPicker({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(time: string | null) {
    if (time === value) return;
    const previous = value;
    setValue(time);
    setError(null);
    startTransition(async () => {
      const result = await setSameDayCutoff(time);
      if (result.error) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => choose(null)}
          disabled={pending}
          aria-pressed={value === null}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
            value === null
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600"
          }`}
        >
          마감 없음
        </button>
        {CUTOFF_OPTIONS.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => choose(time)}
            disabled={pending}
            aria-pressed={value === time}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
              value === time
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600"
            }`}
          >
            {time}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">
        {value
          ? `${value} 이후에는 오늘 날짜로 새 예약을 받지 않아요. 내일 이후 날짜는 영향 없어요.`
          : "당일 예약은 각 시간이 실제로 지나기 전까지 계속 받아요."}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// 06시~23시 — a cleaning visit before 6am or after 11pm isn't realistic,
// and keeping the grid to this range means it fits in three rows of six.
const CUSTOM_HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);

/** "특정 시간만 예약 받기" — hand-pick exactly which hours are bookable
 * (e.g. [10, 15] for "10시, 15시만"), instead of a continuous range. Empty
 * selection means "not customized": bookable times fall back to being
 * generated from 영업시간/예약 텀. */
export function CustomTimeSlotsPicker({ initial }: { initial: number[] }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: number[]) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await setCustomTimeSlots(next);
      if (result.error) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  function toggle(hour: number) {
    save(value.includes(hour) ? value.filter((h) => h !== hour) : [...value, hour].sort((a, b) => a - b));
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5">
        {CUSTOM_HOUR_OPTIONS.map((hour) => {
          const active = value.includes(hour);
          return (
            <button
              key={hour}
              type="button"
              onClick={() => toggle(hour)}
              disabled={pending}
              aria-pressed={active}
              className={`h-9 rounded-lg border text-xs font-medium disabled:opacity-60 ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              {String(hour).padStart(2, "0")}시
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">
        {value.length > 0
          ? `선택한 ${value.length}개 시간만 고객에게 보여요. 영업시간 설정은 무시돼요.`
          : "아무것도 선택하지 않으면 위에서 설정한 영업시간과 예약 텀으로 자동 계산돼요."}
      </p>
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => save([])}
          disabled={pending}
          className="mt-1.5 text-[11px] font-medium text-neutral-500 underline disabled:opacity-60"
        >
          전체 해제하고 자동 계산으로 되돌리기
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
