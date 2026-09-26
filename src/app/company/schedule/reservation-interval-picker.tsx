"use client";

import { useState, useTransition } from "react";
import { setReservationInterval } from "./actions";

const OPTIONS = [
  { hours: 1, label: "1시간", desc: "바로 다음 시간부터 예약 가능" },
  { hours: 2, label: "2시간", desc: "한 시간 건너뛰고 예약 가능" },
] as const;

/** "예약 텀" — how many hours one visit occupies, so the next booking can't
 * land before the crew is realistically free. E.g. 2시간 텀으로 13시에
 * 예약이 들어오면 14시는 막히고 15시부터 다시 예약할 수 있어요. */
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
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
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
        청소 한 건이 몇 시간짜리 일감인지에 맞춰서, 그 시간 동안은 다른 예약이
        안 들어오게 해요. 예: 2시간으로 하면 13시 예약이 있을 때 14시는 막히고
        15시부터 다시 예약할 수 있어요.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
