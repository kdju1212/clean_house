import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { deleteAccountForUser } from "@/lib/account-deletion-service";

/** Mobile equivalent of the web /mypage 회원 탈퇴 action — the client is
 * responsible for discarding its stored token right after a successful
 * call, the same way it already does on a normal logout. */
export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await deleteAccountForUser(userId);
  return NextResponse.json({ ok: true });
}
