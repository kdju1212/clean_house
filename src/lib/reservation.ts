export const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

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
 * — one visit ties up a crew for `intervalHours` consecutive TIME_SLOTS
 * starting at its own time (1 hour just occupies the exact slot; 2 hours
 * also occupies the following one, e.g. a 13:00 booking leaves 15:00 as the
 * next open slot). A slot is only reported as blocked once `crewCount`
 * visits already occupy it — a company with 2+ crews can run that many
 * bookings for the same hour before it's actually full. Relies on
 * TIME_SLOTS being contiguous hourly entries, so "N slots later" is just
 * "N array indices later".
 */
export function blockedTimeSlots(
  bookedTimes: string[],
  intervalHours: number,
  crewCount: number
): string[] {
  const occupancy = new Map<string, number>();
  for (const time of bookedTimes) {
    const idx = TIME_SLOTS.indexOf(time);
    if (idx === -1) continue;
    for (let i = 0; i < intervalHours; i++) {
      const slot = TIME_SLOTS[idx + i];
      if (slot) occupancy.set(slot, (occupancy.get(slot) ?? 0) + 1);
    }
  }
  return TIME_SLOTS.filter((t) => (occupancy.get(t) ?? 0) >= crewCount);
}
