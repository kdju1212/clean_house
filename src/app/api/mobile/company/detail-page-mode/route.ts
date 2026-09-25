import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { updateDetailPageModeForOwner } from "@/lib/company-profile-service";

/** Mobile equivalent of the web updateDetailPageMode Server Action — sets
 * whether the 상세페이지 section renders as a stacked custom image or a
 * site-generated photo grid. */
export async function PATCH(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    await updateDetailPageModeForOwner(userId, body?.mode);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
