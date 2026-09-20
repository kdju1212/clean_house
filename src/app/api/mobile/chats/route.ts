import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { getMyChatRooms } from "@/lib/chat-service";

/** Backs the app's 내 채팅 tab — every chat thread the caller is a party
 * to, whether as the customer who booked or the company being booked. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rooms = await getMyChatRooms(userId);
  return NextResponse.json({ rooms });
}
