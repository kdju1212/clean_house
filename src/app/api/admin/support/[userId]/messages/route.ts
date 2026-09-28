import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupportChatMessages, sendSupportMessage } from "@/lib/support-chat";

/** Admin side of one user's 고객센터 문의 thread — see
 * /api/support-chat/messages for that user's own side of the same room. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { userId } = await params;
  const result = await getSupportChatMessages(userId, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { userId } = await params;
  const body = await req.json().catch(() => null);
  const result = await sendSupportMessage(userId, session.user.id, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
