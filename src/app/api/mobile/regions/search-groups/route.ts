import { NextResponse } from "next/server";
import { searchRegionGroups } from "@/lib/region";

/**
 * Grouped region search backing the company service-area picker (web and
 * app): unlike /api/mobile/regions/search, each hit here is a 시/군/구 with
 * its full 동 list attached, so the UI can offer a "전체" bulk-toggle once
 * search has found the group. No auth: same "public utility" trust level as
 * GET /api/mobile/regions.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const groups = await searchRegionGroups(q);
  return NextResponse.json({ groups });
}
