import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupportChatMessages, sendSupportMessage } from "@/lib/support-chat";

/** The caller's own 고객센터 문의 thread — always their own userId as the
 * room owner. Admins reply through /api/admin/support/[userId]/messages
 * instead, since they're viewing someone else's room. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const result = await getSupportChatMessages(session.user.id, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = await sendSupportMessage(session.user.id, session.user.id, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
