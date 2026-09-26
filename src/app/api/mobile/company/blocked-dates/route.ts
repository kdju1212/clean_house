import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import {
  addBlockedDateForOwner,
  koreaTodayStr,
  listUpcomingBlockedDatesForOwner,
  removeBlockedDateForOwner,
} from "@/lib/company-schedule-service";

/** Mobile equivalent of the web 휴무일 page + reservation calendar toggle.
 * Dates are "YYYY-MM-DD" in both directions. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    const dates = await listUpcomingBlockedDatesForOwner(userId);
    return NextResponse.json({ dates, today: koreaTodayStr() });
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
