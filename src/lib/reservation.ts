// Used when a company hasn't set its own 영업시간 yet (or the stored value
// isn't a well-formed "HH:00-HH:00") — the exact range every company used
// to be stuck with before per-company hours existed, so an unset company
// keeps working exactly as before.
const DEFAULT_BUSINESS_HOURS: [start: number, end: number] = [9, 18];

const BUSINESS_HOURS_RE = /^(\d{2}):00-(\d{2}):00$/;

function parseBusinessHoursRange(businessHours: string | null): [number, number] {
  const match = businessHours ? BUSINESS_HOURS_RE.exec(businessHours) : null;
  if (match) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (end > start) return [start, end];
  }
  return DEFAULT_BUSINESS_HOURS;
}

/**
 * A company's own bookable times, hourly, from its 영업시간 (see
 * BusinessHoursPicker) — the last slot is early enough that a
 * `intervalHours`-long visit starting there still finishes by closing time,
 * so a company that closes at 18:00 with a 2-hour 예약 텀 never offers
 * 17:00 (that job would run past close); it only ever offers up to 16:00.
 */
export function generateTimeSlots(businessHours: string | null, intervalHours: number): string[] {
  const [start, end] = parseBusinessHoursRange(businessHours);
  const lastStart = end - intervalHours;
  const slots: string[] = [];
  for (let h = start; h <= lastStart; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "예약 신청",
  ACCEPTED: "예약 확정",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
  NO_SHOW: "노쇼",
};

export const RESERVATION_STATUS_BADGE_CLASS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-neutral-200 text-neutral-600",
  CANCELLED: "bg-neutral-200 text-neutral-600",
  COMPLETED: "bg-blue-100 text-blue-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

/** The `include` every reservation query uses to get its services in the
 * order the customer picked them. */
export const RESERVATION_ITEMS_INCLUDE = {
  include: { category: true },
  orderBy: { order: "asc" },
} as const;

/** "입주청소 · 에어컨청소" — one label for a reservation's services. */
export function reservationServiceNames(items: { category: { name: string } }[]): string {
  return items.map((i) => i.category.name).join(" · ");
}

/**
 * Expands each already-booked time into the full run of slots it occupies
 * — one visit ties up a crew for `intervalHours` consecutive entries of
 * `slots` starting at its own time (1 hour just occupies the exact slot; 2
 * hours also occupies the following one, e.g. a 13:00 booking leaves 15:00
 * as the next open slot). A slot is only reported as blocked once
 * `crewCount` visits already occupy it — a company with 2+ crews can run
 * that many bookings for the same hour before it's actually full. `slots`
 * must be this company's own generateTimeSlots() result, contiguous hourly
 * entries, so "N slots later" is just "N array indices later".
 */
export function blockedTimeSlots(
  slots: string[],
  bookedTimes: string[],
  intervalHours: number,
  crewCount: number
): string[] {
  const occupancy = new Map<string, number>();
  for (const time of bookedTimes) {
    const idx = slots.indexOf(time);
    if (idx === -1) continue;
    for (let i = 0; i < intervalHours; i++) {
      const slot = slots[idx + i];
      if (slot) occupancy.set(slot, (occupancy.get(slot) ?? 0) + 1);
    }
  }
  return slots.filter((t) => (occupancy.get(t) ?? 0) >= crewCount);
}
