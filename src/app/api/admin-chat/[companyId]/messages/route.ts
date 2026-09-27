import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminChatMessages, sendAdminChatMessage } from "@/lib/admin-chat";

/** Backs both /admin/companies/[id]/chat (admin side) and /company/chat
 * (the company owner's side) — see requireAdminChatAccess in admin-chat.ts
 * for who's allowed to read/post here. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { companyId } = await params;
  const result = await getAdminChatMessages(companyId, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { companyId } = await params;
  const body = await req.json().catch(() => null);
  const result = await sendAdminChatMessage(companyId, session.user.id, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
