"use client";

import { useState, useTransition } from "react";
import { setCustomTimeSlots } from "./actions";

// 06시~23시 — a cleaning visit before 6am or after 11pm isn't realistic,
// and keeping the grid to this range means it fits in three rows of six.
const CUSTOM_HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);

/** "특정 시간만 예약 받기" — hand-pick exactly which hours are bookable
 * (e.g. [10, 15] for "10시, 15시만"), instead of a continuous range. Empty
 * selection means "not customized": bookable times fall back to being
 * generated from 영업시간/예약 텀 (see the reservation-interval settings on
 * 휴무일 관리). */
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
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      특정 시간만 예약 받기
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
      <p className="text-[11px] font-normal text-neutral-400">
        {value.length > 0
          ? `선택한 ${value.length}개 시간만 고객에게 보여요. 영업시간 설정은 무시돼요.`
          : "아무것도 선택하지 않으면 영업시간과 예약 텀(휴무일 관리)으로 자동 계산돼요."}
      </p>
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => save([])}
          disabled={pending}
          className="text-left text-[11px] font-medium text-neutral-500 underline disabled:opacity-60"
        >
          전체 해제하고 자동 계산으로 되돌리기
        </button>
      )}
      {error && <p className="text-xs font-normal text-red-600">{error}</p>}
    </div>
  );
}
