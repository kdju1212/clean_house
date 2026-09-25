import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { deletePhotoForOwner, updatePhotoCaptionForOwner } from "@/lib/company-profile-service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  await deletePhotoForOwner(userId, id);
  return NextResponse.json({ ok: true });
}

/** Sets a grid photo's caption (SITE_TEMPLATE mode only — see
 * updatePhotoCaption on the web repo). */
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

  try {
    await updatePhotoCaptionForOwner(userId, id, body?.caption);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
