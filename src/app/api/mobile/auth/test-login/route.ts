import { NextResponse } from "next/server";
import { issueMobileToken } from "@/lib/mobile-auth";
import { isTestLoginEnabled, isTestLoginRole, upsertTestUser, verifyTestLoginSecret } from "@/lib/test-login";

/**
 * Mobile counterpart to the web /dev-login page — internal QA only, inert
 * unless TEST_LOGIN_SECRET is set. Takes { secret, role } instead of an
 * OAuth access token and issues the same kind of app-scoped JWT the Kakao
 * login route does, for a fixed per-role test User (see src/lib/test-login.ts).
 */
export async function POST(request: Request) {
  if (!isTestLoginEnabled()) {
    return NextResponse.json({ error: "테스트 로그인이 비활성화되어 있습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const secret = typeof body?.secret === "string" ? body.secret : null;
  const role = body?.role;

  if (!verifyTestLoginSecret(secret) || !isTestLoginRole(role)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  const user = await upsertTestUser(role);
  const token = await issueMobileToken(user.id, user.role);

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
}
