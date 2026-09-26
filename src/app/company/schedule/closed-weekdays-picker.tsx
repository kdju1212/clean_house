"use client";

import { useState, useTransition } from "react";
import { setClosedWeekdays } from "./actions";

export const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

/** "정기 휴무" — tap a weekday to close every week on that day. Saves on each
 * tap; `onChange` only fires once the server accepted it. */
export function ClosedWeekdaysPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(day: number) {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day].sort((a, b) => a - b);
    setError(null);
    startTransition(async () => {
      const result = await setClosedWeekdays(next);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChange(next);
    });
  }

  return (
    <div>
      <div className="flex gap-1">
        {WEEKDAY_NAMES.map((name, day) => {
          const active = value.includes(day);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(day)}
              disabled={pending}
              aria-pressed={active}
              className={`h-8 flex-1 rounded-lg border text-xs font-medium disabled:opacity-60 ${
                active
                  ? "border-neutral-500 bg-neutral-500 text-white"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">
        {value.length > 0
          ? `매주 ${value.map((d) => WEEKDAY_NAMES[d]).join("·")}요일은 예약을 받지 않아요.`
          : "쉬는 요일을 누르면 매주 그 요일엔 예약을 받지 않아요."}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Client wrapper for the server-rendered 휴무일 page, which has no state of
 * its own to hold the current selection. */
export function ClosedWeekdaysSection({ initial }: { initial: number[] }) {
  const [value, setValue] = useState(initial);
  return <ClosedWeekdaysPicker value={value} onChange={setValue} />;
}
