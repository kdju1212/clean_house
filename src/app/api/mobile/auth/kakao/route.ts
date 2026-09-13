import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileToken } from "@/lib/mobile-auth";
import { bootstrapAdminRole } from "@/lib/admin-bootstrap";

type KakaoUserResponse = {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string };
  };
};

/**
 * The mobile app signs in with Kakao's native SDK and gets a Kakao access
 * token directly from Kakao — our server never sees the user's Kakao
 * password. We take that token, ask Kakao who it belongs to (never trust a
 * client-supplied user id/email), then mint our own app-scoped JWT for the
 * app to use on subsequent requests. This reuses the same Account table
 * Auth.js's web login writes to (provider + providerAccountId), so a user
 * who's already used Kakao on the web resolves to the same User row here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kakaoAccessToken =
    typeof body?.accessToken === "string" ? body.accessToken : null;
  if (!kakaoAccessToken) {
    return NextResponse.json({ error: "accessToken이 필요합니다." }, { status: 400 });
  }

  const kakaoRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${kakaoAccessToken}` },
  });
  if (!kakaoRes.ok) {
    return NextResponse.json({ error: "카카오 인증에 실패했습니다." }, { status: 401 });
  }
  const kakaoUser: KakaoUserResponse = await kakaoRes.json();
  const providerAccountId = String(kakaoUser.id);
  const email = kakaoUser.kakao_account?.email ?? null;
  const name = kakaoUser.kakao_account?.profile?.nickname ?? null;

  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "kakao", providerAccountId } },
    include: { user: true },
  });

  let user = existingAccount?.user ?? null;

  if (!user) {
    // Kakao's email consent item requires business verification (see
    // README/earlier ops notes) — email is often null. When it is present,
    // link to any existing account with that email instead of hitting the
    // User.email unique constraint with a duplicate.
    const existingUserByEmail = email
      ? await prisma.user.findUnique({ where: { email } })
      : null;

    if (existingUserByEmail) {
      await prisma.account.create({
        data: {
          userId: existingUserByEmail.id,
          type: "oauth",
          provider: "kakao",
          providerAccountId,
        },
      });
      user = existingUserByEmail;
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email: email ?? undefined,
          accounts: {
            create: { type: "oauth", provider: "kakao", providerAccountId },
          },
        },
      });
    }
  }

  const role = await bootstrapAdminRole({ id: user.id, email: user.email, role: user.role });
  const token = await issueMobileToken(user.id, role);

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role },
  });
}
