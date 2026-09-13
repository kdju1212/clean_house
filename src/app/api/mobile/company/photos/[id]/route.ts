import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { deletePhotoForOwner } from "@/lib/company-profile-service";

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
