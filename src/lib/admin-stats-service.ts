import "server-only";
import { prisma } from "@/lib/prisma";

/** KST calendar parts (Y/M/D) for an instant — same +9h shift trick as
 * company-schedule-service's koreaTodayStr, just kept local here since this
 * needs the parts (not a formatted string) to build KST month boundaries. */
function kstParts(date: Date): { y: number; m: number; d: number } {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

/** The real UTC instant of KST midnight on the given KST calendar date —
 * `m`/`d` can overflow (e.g. month 12, day 0) and JS normalizes them, which
 * is what lets "one month before" just be `m - 1`. */
function kstMidnightUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - 9 * 60 * 60 * 1000);
}

export type MonthlyRevenuePoint = {
  /** "YY.M", e.g. "25.6" — short and unambiguous across a year boundary. */
  label: string;
  revenue: number;
  count: number;
};

export type AdminRevenueStats = {
  today: { revenue: number; count: number };
  thisMonth: { revenue: number; count: number };
  allTime: { revenue: number; count: number };
  newCustomersThisMonth: number;
  newCompaniesThisMonth: number;
  activeCompanies: number;
  /** Oldest → newest, one point per month. */
  monthly: MonthlyRevenuePoint[];
};

/**
 * "거래액" here means the total price of COMPLETED reservations — we're a
 * directory/matching site that never processes payment ourselves (see
 * Company.websiteUrl's comment), so there's no separate platform-commission
 * revenue to report. This is the closest honest number: how much booking
 * value the marketplace has actually closed.
 */
export async function getRevenueStatsForAdmin(months: number): Promise<AdminRevenueStats> {
  const now = new Date();
  const { y: ty, m: tm, d: td } = kstParts(now);

  const todayStart = kstMidnightUtc(ty, tm, td);
  const todayEnd = kstMidnightUtc(ty, tm, td + 1);
  const monthStart = kstMidnightUtc(ty, tm, 1);
  const nextMonthStart = kstMidnightUtc(ty, tm + 1, 1);
  // Oldest bucket's start — e.g. months=6 means this month plus the 5 before it.
  const rangeStart = kstMidnightUtc(ty, tm - (months - 1), 1);

  const [rangeReservations, allTime, newCustomersThisMonth, newCompaniesThisMonth, activeCompanies] =
    await Promise.all([
      prisma.reservation.findMany({
        where: { status: "COMPLETED", completedAt: { gte: rangeStart } },
        select: { completedAt: true, price: true },
      }),
      prisma.reservation.aggregate({
        where: { status: "COMPLETED" },
        _sum: { price: true },
        _count: true,
      }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.company.count({
        where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.company.count({ where: { status: "ACTIVE" } }),
    ]);

  // One bucket per month in range, keyed by KST y*12+m so lookups don't
  // need string parsing.
  const buckets = new Map<number, { revenue: number; count: number }>();
  for (let i = 0; i < months; i++) {
    const bucketDate = kstMidnightUtc(ty, tm - (months - 1) + i, 1);
    const { y, m } = kstParts(bucketDate);
    buckets.set(y * 12 + m, { revenue: 0, count: 0 });
  }

  let todayRevenue = 0;
  let todayCount = 0;
  let monthRevenue = 0;
  let monthCount = 0;

  for (const r of rangeReservations) {
    if (!r.completedAt) continue;
    const price = r.price ?? 0;
    const { y, m } = kstParts(r.completedAt);
    const bucket = buckets.get(y * 12 + m);
    if (bucket) {
      bucket.revenue += price;
      bucket.count += 1;
    }
    if (r.completedAt >= todayStart && r.completedAt < todayEnd) {
      todayRevenue += price;
      todayCount += 1;
    }
    if (r.completedAt >= monthStart && r.completedAt < nextMonthStart) {
      monthRevenue += price;
      monthCount += 1;
    }
  }

  const monthly: MonthlyRevenuePoint[] = [];
  for (let i = 0; i < months; i++) {
    const bucketDate = kstMidnightUtc(ty, tm - (months - 1) + i, 1);
    const { y, m } = kstParts(bucketDate);
    const bucket = buckets.get(y * 12 + m) ?? { revenue: 0, count: 0 };
    monthly.push({ label: `${String(y).slice(2)}.${m + 1}`, ...bucket });
  }

  return {
    today: { revenue: todayRevenue, count: todayCount },
    thisMonth: { revenue: monthRevenue, count: monthCount },
    allTime: { revenue: allTime._sum.price ?? 0, count: allTime._count },
    newCustomersThisMonth,
    newCompaniesThisMonth,
    activeCompanies,
    monthly,
  };
}
