import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import {
  setCrewCountForOwner,
  setReservationIntervalForOwner,
  setSameDayCutoffForOwner,
} from "@/lib/company-schedule-service";

/** Mobile equivalent of the web /company/schedule page's 예약 텀 / 동시 팀 수 /
 * 당일 예약 마감시간 pickers — each saves immediately, one field per call,
 * same as the web Server Actions this hits. Body is exactly one of
 * { reservationIntervalHours }, { crewCount }, or { sameDayCutoffTime }. */
export async function PATCH(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    if (body && "reservationIntervalHours" in body) {
      const reservationIntervalHours = await setReservationIntervalForOwner(
        userId,
        body.reservationIntervalHours
      );
      return NextResponse.json({ reservationIntervalHours });
    }
    if (body && "crewCount" in body) {
      const crewCount = await setCrewCountForOwner(userId, body.crewCount);
      return NextResponse.json({ crewCount });
    }
    if (body && "sameDayCutoffTime" in body) {
      const sameDayCutoffTime = await setSameDayCutoffForOwner(userId, body.sameDayCutoffTime);
      return NextResponse.json({ sameDayCutoffTime });
    }
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
