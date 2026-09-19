import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { updateCustomerPhone } from "@/lib/customer-profile-service";

/** Mobile equivalent of the web mypage's updatePhone Server Action — same
 * shared validation core. */
export async function PATCH(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    await updateCustomerPhone(userId, body?.phone);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
