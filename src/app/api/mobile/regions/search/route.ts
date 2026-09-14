import { NextResponse } from "next/server";
import { searchRegions } from "@/lib/region";

/**
 * Region-name search backing the region picker's search box (web and app
 * both). Exists so the client never has to hold the full ~5,000-row region
 * tree just to filter it locally — see searchRegions() for why. No auth:
 * same "public utility" trust level as GET /api/mobile/regions.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const results = await searchRegions(q);
  return NextResponse.json({ results });
}
