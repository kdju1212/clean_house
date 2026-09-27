import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { getRevenueStatsForAdmin } from "@/lib/admin-stats-service";

const PERIOD_OPTIONS = [6, 12] as const;

/** Mobile equivalent of the web /admin/stats revenue dashboard —
 * ?months=6 (default) or 12. */
export async function GET(request: Request) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawMonths = Number(searchParams.get("months"));
  const months = PERIOD_OPTIONS.includes(rawMonths as (typeof PERIOD_OPTIONS)[number])
    ? (rawMonths as (typeof PERIOD_OPTIONS)[number])
    : 6;

  const stats = await getRevenueStatsForAdmin(months);
  return NextResponse.json(stats);
}
