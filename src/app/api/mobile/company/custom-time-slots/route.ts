import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { setCustomTimeSlotsForOwner } from "@/lib/company-schedule-service";

/** Mobile equivalent of the web CustomTimeSlotsPicker's setCustomTimeSlots
 * Server Action — 업체 프로필 관리's "특정 시간만 예약 받기". Body:
 * { customTimeSlots: number[] } (hours 0–23); empty clears it. */
export async function PATCH(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    const customTimeSlots = await setCustomTimeSlotsForOwner(userId, body?.customTimeSlots);
    return NextResponse.json({ customTimeSlots });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
