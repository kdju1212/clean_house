import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import {
  addBlockedDateForOwner,
  getClosedWeekdaysForOwner,
  koreaTodayStr,
  listUpcomingBlockedDatesForOwner,
  removeBlockedDateForOwner,
  setClosedWeekdaysForOwner,
} from "@/lib/company-schedule-service";

/** Mobile equivalent of the web 휴무일 page + reservation calendar toggle.
 * Dates are "YYYY-MM-DD" in both directions; closedWeekdays are 0=일 … 6=토. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    const [dates, closedWeekdays] = await Promise.all([
      listUpcomingBlockedDatesForOwner(userId),
      getClosedWeekdaysForOwner(userId),
    ]);
    return NextResponse.json({ dates, closedWeekdays, today: koreaTodayStr() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "불러오지 못했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return mutate(request, addBlockedDateForOwner);
}

export async function DELETE(request: Request) {
  return mutate(request, removeBlockedDateForOwner);
}

/** Replaces the 정기 휴무 weekdays: body { closedWeekdays: number[] }. */
export async function PATCH(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  try {
    const closedWeekdays = await setClosedWeekdaysForOwner(userId, body?.closedWeekdays);
    return NextResponse.json({ closedWeekdays });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function mutate(
  request: Request,
  fn: (userId: string, date: unknown) => Promise<void>
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  try {
    await fn(userId, body?.date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
