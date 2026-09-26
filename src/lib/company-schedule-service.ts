import "server-only";
import { prisma } from "@/lib/prisma";
import { requireOwnedCompany } from "@/lib/company-auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Korea as "YYYY-MM-DD" — the server runs in UTC, which is
 * still yesterday until 09:00 KST. */
export function koreaTodayStr(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseDateStr(value: unknown): Date {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new Error("휴무일을 선택해주세요.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("휴무일을 선택해주세요.");
  }
  if (value < koreaTodayStr()) {
    throw new Error("오늘 이후 날짜를 선택해주세요.");
  }
  return date;
}

/** Upcoming (today onward) blocked dates as "YYYY-MM-DD", ascending. */
export async function listUpcomingBlockedDatesForOwner(ownerUserId: string): Promise<string[]> {
  const company = await requireOwnedCompany(ownerUserId);
  const rows = await prisma.companyBlockedDate.findMany({
    where: { companyId: company.id, date: { gte: new Date(`${koreaTodayStr()}T00:00:00.000Z`) } },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  return rows.map((r) => r.date.toISOString().slice(0, 10));
}

export async function addBlockedDateForOwner(ownerUserId: string, dateStr: unknown): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);
  const date = parseDateStr(dateStr);
  try {
    await prisma.companyBlockedDate.create({ data: { companyId: company.id, date } });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      throw new Error("이미 휴무일로 등록된 날짜예요.");
    }
    throw err;
  }
}

export async function removeBlockedDateForOwner(ownerUserId: string, dateStr: unknown): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);
  if (typeof dateStr !== "string" || !DATE_RE.test(dateStr)) {
    throw new Error("잘못된 날짜예요.");
  }
  await prisma.companyBlockedDate.deleteMany({
    where: { companyId: company.id, date: new Date(`${dateStr}T00:00:00.000Z`) },
  });
}

// How far ahead a weekly rule is expanded into concrete dates for customers
// — well past how far out anyone books a cleaning.
const EXPANSION_DAYS = 180;

/** Validates and normalizes a weekday list (0=일 … 6=토): unique, sorted. */
function parseWeekdays(value: unknown): number[] {
  if (!Array.isArray(value) || value.some((v) => !Number.isInteger(v) || v < 0 || v > 6)) {
    throw new Error("잘못된 요일이에요.");
  }
  return [...new Set(value as number[])].sort((a, b) => a - b);
}

export async function getClosedWeekdaysForOwner(ownerUserId: string): Promise<number[]> {
  const company = await requireOwnedCompany(ownerUserId);
  return company.closedWeekdays;
}

export async function setClosedWeekdaysForOwner(
  ownerUserId: string,
  weekdays: unknown
): Promise<number[]> {
  const company = await requireOwnedCompany(ownerUserId);
  const parsed = parseWeekdays(weekdays);
  await prisma.company.update({ where: { id: company.id }, data: { closedWeekdays: parsed } });
  return parsed;
}

/** Whether a stored @db.Date (UTC midnight) falls on a weekly day off. */
export function isClosedWeekday(date: Date, closedWeekdays: number[]): boolean {
  return closedWeekdays.includes(date.getUTCDay());
}

/**
 * Everything a customer can't book, as "YYYY-MM-DD": the one-off 휴무일 plus
 * every upcoming date that falls on a weekly day off. Expanded server-side
 * so every client (including app builds that predate weekly holidays)
 * handles both kinds the same way.
 */
export function customerBlockedDates(specificDates: Date[], closedWeekdays: number[]): string[] {
  const result = new Set(specificDates.map((d) => d.toISOString().slice(0, 10)));
  if (closedWeekdays.length > 0) {
    const start = new Date(`${koreaTodayStr()}T00:00:00.000Z`);
    for (let i = 0; i < EXPANSION_DAYS; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      if (closedWeekdays.includes(d.getUTCDay())) result.add(d.toISOString().slice(0, 10));
    }
  }
  return [...result].sort();
}

const VALID_INTERVAL_HOURS = [1, 2];

export async function getReservationIntervalForOwner(ownerUserId: string): Promise<number> {
  const company = await requireOwnedCompany(ownerUserId);
  return company.reservationIntervalHours;
}

export async function setReservationIntervalForOwner(
  ownerUserId: string,
  hours: unknown
): Promise<number> {
  const company = await requireOwnedCompany(ownerUserId);
  if (typeof hours !== "number" || !VALID_INTERVAL_HOURS.includes(hours)) {
    throw new Error("잘못된 예약 텀이에요.");
  }
  await prisma.company.update({
    where: { id: company.id },
    data: { reservationIntervalHours: hours },
  });
  return hours;
}
