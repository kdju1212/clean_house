import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { getAllCategoryProfiles } from "@/lib/category-profile-service";

/** Every saved CategoryProfile at once, keyed by category slug — the app's
 * reservation form fetches this once to pre-fill whichever category the
 * customer ends up picking, mirroring the web form's categoryProfiles prop. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const profiles = await getAllCategoryProfiles(userId);
  return NextResponse.json({ profiles });
}
