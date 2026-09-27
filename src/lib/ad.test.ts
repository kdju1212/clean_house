import { describe, expect, it } from "vitest";
import { getAdStatus, startOfToday } from "@/lib/ad";

describe("startOfToday", () => {
  it("returns Korea's calendar date even during the UTC-lag window (00:00–08:59 KST)", () => {
    // 2026-09-27T02:00:00 KST == 2026-09-26T17:00:00 UTC — the server's own
    // UTC clock still reads the 26th, but Korea has already rolled over.
    const kstEarlyMorning = new Date("2026-09-26T17:00:00.000Z").getTime();
    const nowSpy = () => kstEarlyMorning;
    const originalNow = Date.now;
    Date.now = nowSpy;
    try {
      expect(startOfToday().toISOString()).toBe("2026-09-27T00:00:00.000Z");
    } finally {
      Date.now = originalNow;
    }
  });
});

describe("getAdStatus", () => {
  const asDate = (dateStr: string) => new Date(`${dateStr}T00:00:00.000Z`);

  function withNow(isoUtc: string, run: () => void) {
    const originalNow = Date.now;
    Date.now = () => new Date(isoUtc).getTime();
    try {
      run();
    } finally {
      Date.now = originalNow;
    }
  }

  it("is CANCELLED regardless of dates", () => {
    expect(
      getAdStatus({ cancelled: true, startDate: asDate("2026-01-01"), endDate: asDate("2026-01-02") })
    ).toBe("CANCELLED");
  });

  it("is SCHEDULED, ACTIVE, then ENDED across the window", () => {
    // Each time below is noon KST (03:00 UTC) on its labeled date, well
    // clear of the UTC-lag window so the date is unambiguous.
    const ad = { cancelled: false, startDate: asDate("2026-09-27"), endDate: asDate("2026-09-29") };
    withNow("2026-09-26T03:00:00.000Z", () => expect(getAdStatus(ad)).toBe("SCHEDULED"));
    withNow("2026-09-27T03:00:00.000Z", () => expect(getAdStatus(ad)).toBe("ACTIVE"));
    withNow("2026-09-29T03:00:00.000Z", () => expect(getAdStatus(ad)).toBe("ACTIVE"));
    withNow("2026-09-30T03:00:00.000Z", () => expect(getAdStatus(ad)).toBe("ENDED"));
  });

  it("already treats an ad starting today (Korea) as ACTIVE during the UTC-lag window", () => {
    const ad = { cancelled: false, startDate: asDate("2026-09-27"), endDate: asDate("2026-09-29") };
    // 2026-09-27T02:00 KST == 2026-09-26T17:00 UTC.
    withNow("2026-09-26T17:00:00.000Z", () => expect(getAdStatus(ad)).toBe("ACTIVE"));
  });
});
