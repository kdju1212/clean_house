import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { replyToReviewForOwner, deleteReviewReplyForOwner } from "@/lib/review-service";

/** Mobile equivalent of the web /company/reviews reply/delete Server
 * Actions. Body for PATCH: { reply: string }. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await replyToReviewForOwner(userId, id, body?.reply);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteReviewReplyForOwner(userId, id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
