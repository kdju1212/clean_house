"use client";

import { useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" -> "2026년 9월 29일 (화)" */
export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

/**
 * Inline month-grid date picker — the web counterpart of the app's
 * CalendarDatePicker. Days before `minDateStr` and `blockedDates` (the
 * company's 휴무일, weekly ones already expanded by the server) are grayed
 * out and can't be picked; the server re-checks regardless.
 */
export function DateCalendarPicker({
  value,
  onChange,
  minDateStr,
  blockedDates,
}: {
  value: string;
  onChange: (dateStr: string) => void;
  minDateStr: string;
  blockedDates: string[];
}) {
  const [view, setView] = useState(() => {
    const [y, m] = (value || minDateStr).split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const blocked = new Set(blockedDates);

  const [minYear, minMonth] = minDateStr.split("-").map(Number);
  const canGoPrev = view.year > minYear || (view.year === minYear && view.month > minMonth - 1);

  function shiftMonth(delta: number) {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  const startWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${view.year}-${pad(view.month + 1)}-${pad(i + 1)}`
    ),
  ];

  return (
    <div className="rounded-xl border border-neutral-200 p-3 font-normal">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrev}
          aria-label="이전 달"
          className="px-2 py-1 text-lg text-neutral-500 disabled:text-neutral-200"
        >
          ‹
        </button>
        <p className="text-sm font-semibold">
          {view.year}년 {view.month + 1}월
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
          className="px-2 py-1 text-lg text-neutral-500"
        >
          ›
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 text-center text-[11px] text-neutral-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;
          const past = dateStr < minDateStr;
          const isBlocked = !past && blocked.has(dateStr);
          const selected = dateStr === value;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={past || isBlocked}
              onClick={() => onChange(dateStr)}
              aria-pressed={selected}
              aria-label={`${formatDateLabel(dateStr)}${isBlocked ? " 휴무일" : ""}`}
              className={`flex h-9 flex-col items-center justify-center rounded-lg text-sm ${
                selected
                  ? "bg-neutral-900 font-semibold text-white"
                  : isBlocked
                    ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
                    : past
                      ? "cursor-not-allowed text-neutral-300"
                      : "text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              {Number(dateStr.slice(-2))}
            </button>
          );
        })}
      </div>
      {blockedDates.length > 0 && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
          <span className="inline-block h-3 w-3 rounded bg-neutral-200" /> 업체 휴무일
        </p>
      )}
    </div>
  );
}
