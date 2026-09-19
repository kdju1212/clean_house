import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { isExpoPushToken } from "@/lib/push";
import { prisma } from "@/lib/prisma";

/**
 * The app calls this after login and on every app start so a re-issued or
 * rotated Expo push token stays current — overwrites whatever token this
 * user had before (single-device MVP, same tradeoff as the mobile auth
 * token itself).
 */
export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== "string" || !isExpoPushToken(token)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { pushToken: token } });
  return NextResponse.json({ ok: true });
}

/** Called on logout so a shared/reset device doesn't keep receiving this
 * user's push notifications after they've signed out of it. */
export async function DELETE(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await prisma.user.update({ where: { id: userId }, data: { pushToken: null } });
  return NextResponse.json({ ok: true });
}
