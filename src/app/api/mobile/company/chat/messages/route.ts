import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { getAdminChatMessages, sendAdminChatMessage } from "@/lib/admin-chat";

/** Mobile equivalent of the web company owner's /company/chat page — always
 * "my own company", so unlike /api/admin-chat/[companyId]/messages (which
 * an admin also hits, for any company) this resolves the caller's company
 * itself rather than taking one as a param. No admin equivalent exists on
 * the app — there's no admin UI on mobile at all. */
async function requireOwnCompanyId(userId: string): Promise<string | null> {
  const company = await prisma.company.findUnique({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  return company?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const companyId = await requireOwnCompanyId(userId);
  if (!companyId) {
    return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 });
  }

  const result = await getAdminChatMessages(companyId, userId);
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
  const companyId = await requireOwnCompanyId(userId);
  if (!companyId) {
    return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const result = await sendAdminChatMessage(companyId, userId, body?.content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
