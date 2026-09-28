import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { getSupportChatMessages, sendSupportMessage } from "@/lib/support-chat";

/** Mobile equivalent of the web /admin/support/[userId] page — the admin
 * side of one user's 고객센터 문의 room, for an arbitrary user (unlike
 * /api/mobile/support/messages, which is always "my own room"). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminId = await getMobileAdminUserId(request);
  if (!adminId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId } = await params;
  const result = await getSupportChatMessages(userId, adminId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminId = await getMobileAdminUserId(request);
  if (!adminId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const result = await sendSupportMessage(userId, adminId, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
