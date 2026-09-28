import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { getSupportChatMessages, sendSupportMessage } from "@/lib/support-chat";

/** Mobile equivalent of the web /support page — always the caller's own
 * 고객센터 문의 room. Admins reply through
 * /api/mobile/admin/support/[userId]/messages instead. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const result = await getSupportChatMessages(userId, userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await sendSupportMessage(userId, userId, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
