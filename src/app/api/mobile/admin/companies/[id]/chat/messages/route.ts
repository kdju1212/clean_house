import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { getAdminChatMessages, sendAdminChatMessage } from "@/lib/admin-chat";

/** Mobile equivalent of the web /admin/companies/[id]/chat page — the admin
 * side of a 관리자 문의 room, for an arbitrary company (unlike
 * /api/mobile/company/chat/messages, which is always "my own company" for
 * the owner side). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const result = await getAdminChatMessages(id, userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await sendAdminChatMessage(id, userId, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
