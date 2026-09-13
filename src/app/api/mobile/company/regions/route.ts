import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { setRegionsForOwner } from "@/lib/company-profile-service";

/** Mobile equivalent of the web setRegions Server Action — replaces the
 * company's full region set with whatever leaf region ids are sent (the
 * app's "전체" checkbox fans out to all of a 시/군/구's children client-side,
 * same as the web checkbox tree, so the server never needs to know about
 * "전체" as a concept). */
export async function PUT(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const regionIds = Array.isArray(body?.regionIds)
    ? body.regionIds.filter((v: unknown): v is string => typeof v === "string")
    : [];

  try {
    await setRegionsForOwner(userId, regionIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
