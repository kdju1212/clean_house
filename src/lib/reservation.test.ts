import { describe, expect, it } from "vitest";
import {
  blockedTimeSlots,
  cancellationCutoffDateStr,
  generateTimeSlots,
  isReservationCancellable,
} from "@/lib/reservation";

describe("generateTimeSlots", () => {
  it("defaults to 09:00–18:00 when business hours aren't set", () => {
    expect(generateTimeSlots(null, 1)).toEqual([
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    ]);
  });

  it("never offers a slot whose visit would run past closing time", () => {
    expect(generateTimeSlots("10:00-15:00", 3)).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("falls back to the default for malformed hours", () => {
    expect(generateTimeSlots("18:00-09:00", 1)).toEqual(generateTimeSlots(null, 1));
    expect(generateTimeSlots("아무거나", 1)).toEqual(generateTimeSlots(null, 1));
  });

  it("uses hand-picked hours as-is, sorted, ignoring business hours", () => {
    expect(generateTimeSlots("09:00-18:00", 2, [15, 9])).toEqual(["09:00", "15:00"]);
  });
});

describe("blockedTimeSlots", () => {
  const slots = ["09:00", "10:00", "11:00", "12:00", "13:00"];

  it("blocks just the booked hour for a 1-hour interval", () => {
    expect(blockedTimeSlots(slots, ["10:00"], 1, 1)).toEqual(["10:00"]);
  });

  it("blocks the whole visit span for longer intervals", () => {
    expect(blockedTimeSlots(slots, ["10:00"], 3, 1)).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("only blocks a slot once every crew is busy", () => {
    expect(blockedTimeSlots(slots, ["10:00"], 1, 2)).toEqual([]);
    expect(blockedTimeSlots(slots, ["10:00", "10:00"], 1, 2)).toEqual(["10:00"]);
  });

  it("counts overlapping visits that started at different hours", () => {
    // 09:00 (2h) covers 09–10, 10:00 (2h) covers 10–11 → 10:00 has 2 visits.
    expect(blockedTimeSlots(slots, ["09:00", "10:00"], 2, 2)).toEqual(["10:00"]);
  });
});

describe("cancellation cutoff (당일·전날 취소 불가)", () => {
  it("the earliest cancellable date is two days out", () => {
    expect(cancellationCutoffDateStr("2026-09-27")).toBe("2026-09-29");
  });

  it("rolls over month and year boundaries", () => {
    expect(cancellationCutoffDateStr("2026-02-27")).toBe("2026-03-01");
    expect(cancellationCutoffDateStr("2026-12-31")).toBe("2027-01-02");
  });

  it("blocks today and tomorrow, allows the day after", () => {
    expect(isReservationCancellable("2026-09-27", "2026-09-27")).toBe(false);
    expect(isReservationCancellable("2026-09-28", "2026-09-27")).toBe(false);
    expect(isReservationCancellable("2026-09-29", "2026-09-27")).toBe(true);
    expect(isReservationCancellable("2026-10-15", "2026-09-27")).toBe(true);
  });
});
