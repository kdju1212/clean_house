"use client";

import { useState, useTransition } from "react";
import { setCrewCount, setReservationInterval } from "./actions";

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
