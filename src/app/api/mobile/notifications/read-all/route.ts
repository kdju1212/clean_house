import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { markAllNotificationsReadForUser } from "@/lib/notification";

export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await markAllNotificationsReadForUser(userId);
  return NextResponse.json({ ok: true });
}
