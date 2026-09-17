"use client";

import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const HOURS_PATTERN = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

function parseBusinessHours(value: string): [string, string] {
  if (HOURS_PATTERN.test(value)) {
    const [start, end] = value.split("-");
    return [start, end];
  }
  return ["09:00", "18:00"];
}

/** Tap-to-pick 시작/종료 시간 instead of free text — mirrors the mobile app's picker. */
export function BusinessHoursPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [start, end] = parseBusinessHours(value);
  const [openField, setOpenField] = useState<"start" | "end" | null>(null);

  function select(hour: string) {
    onChange(openField === "start" ? `${hour}-${end}` : `${start}-${hour}`);
    setOpenField(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpenField(openField === "start" ? null : "start")}
          className={`rounded-lg border px-3 py-2 text-sm font-normal ${
            openField === "start" ? "border-neutral-900" : "border-neutral-200"
          }`}
        >
          {start}
        </button>
        <span className="text-sm text-neutral-400">~</span>
        <button
          type="button"
          onClick={() => setOpenField(openField === "end" ? null : "end")}
          className={`rounded-lg border px-3 py-2 text-sm font-normal ${
            openField === "end" ? "border-neutral-900" : "border-neutral-200"
          }`}
        >
          {end}
        </button>
      </div>
      {openField && (
        <div className="flex flex-wrap gap-1.5">
          {HOURS.map((h) => {
            const active = h === (openField === "start" ? start : end);
            return (
              <button
                key={h}
                type="button"
                onClick={() => select(h)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
