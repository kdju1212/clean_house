import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { getChatMessagesForUser, sendChatMessageForUser } from "@/lib/chat-service";

/** Mobile equivalent of /api/reservations/[id]/messages — same shared
 * chat-service functions, bearer token instead of a cookie session. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const result = await getChatMessagesForUser(id, userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await sendChatMessageForUser(id, userId, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
