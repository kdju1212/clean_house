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
 * This company's bookable times. Two modes:
 * - `customHours` set (the owner hand-picked specific hours, e.g. [10, 15]
 *   for "10시, 15시만 받아요") — those exact hours, in order, nothing else.
 * - `customHours` empty (not customized) — generated hourly from 영업시간
 *   (see BusinessHoursPicker): the last slot is early enough that an
 *   `intervalHours`-long visit starting there still finishes by closing
 *   time, so a company that closes at 18:00 with a 2-hour 예약 텀 never
 *   offers 17:00 (that job would run past close); only up to 16:00.
 */
export function generateTimeSlots(
  businessHours: string | null,
  intervalHours: number,
  customHours: number[] = []
): string[] {
  if (customHours.length > 0) {
    return [...customHours].sort((a, b) => a - b).map((h) => `${String(h).padStart(2, "0")}:00`);
  }
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

function slotHour(slot: string): number {
  return Number(slot.slice(0, 2));
}

/**
 * Which of `slots` are already fully booked. Each booked time ties up a
 * crew for `intervalHours` starting at its own hour (1 hour just occupies
 * that hour; 2 hours also occupies the following one, e.g. a 13:00 booking
 * leaves 15:00 as the next open slot) — so any offered slot whose hour
 * falls in that span counts toward it, whether or not the slots in between
 * are themselves offered (a company with hand-picked, non-contiguous
 * hours — see generateTimeSlots' customHours — still gets this right). A
 * slot is only reported as blocked once `crewCount` visits already occupy
 * it, so a company with 2+ crews can run that many bookings for the same
 * hour before it's actually full.
 */
export function blockedTimeSlots(
  slots: string[],
  bookedTimes: string[],
  intervalHours: number,
  crewCount: number
): string[] {
  const occupancy = new Map<string, number>();
  for (const time of bookedTimes) {
    const bookedHour = slotHour(time);
    for (const slot of slots) {
      const hour = slotHour(slot);
      if (hour >= bookedHour && hour < bookedHour + intervalHours) {
        occupancy.set(slot, (occupancy.get(slot) ?? 0) + 1);
      }
    }
  }
  return slots.filter((t) => (occupancy.get(t) ?? 0) >= crewCount);
}

// A reservation can't be cancelled once it's this close — "당일과 전날은
// 취소 불가": the earliest still-cancellable desiredDate is today + 2, so
// today and tomorrow are both too late. The customer agrees to this at
// booking time (see the reservation form's checkbox), and
// cancelReservationForCustomer re-checks it server-side regardless.
export const CANCELLATION_CUTOFF_DAYS = 2;

/** "YYYY-MM-DD" plus `days` days, via Date.UTC so it's never off by one
 * from a DST shift. */
function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The earliest desiredDate ("YYYY-MM-DD") still cancellable, given today's
 * date (also "YYYY-MM-DD", in Korea — see koreaTodayStr). */
export function cancellationCutoffDateStr(todayStr: string): string {
  return addDaysToDateStr(todayStr, CANCELLATION_CUTOFF_DAYS);
}

/** Whether a reservation for `desiredDateStr` can still be cancelled today
 * — used to decide whether to even show a 취소 button; the actual cancel
 * re-checks this server-side (via cancellationCutoffDateStr) regardless. */
export function isReservationCancellable(desiredDateStr: string, todayStr: string): boolean {
  return desiredDateStr >= cancellationCutoffDateStr(todayStr);
}
