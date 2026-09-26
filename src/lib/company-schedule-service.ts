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
