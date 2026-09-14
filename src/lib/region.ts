import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const REGION_COOKIE = "regionId";

/**
 * Returns the customer's selected browsing region, falling back to the
 * first seeded region when nothing has been chosen yet (no GPS lookup
 * in the MVP — see 기획서 2.1).
 */
export async function getSelectedRegion() {
  const cookieStore = await cookies();
  const regionId = cookieStore.get(REGION_COOKIE)?.value;

  if (regionId) {
    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (region) return region;
  }

  return prisma.region.findFirst({ orderBy: { order: "asc" } });
}

/**
 * Returns [regionId, its parentId, its grandparentId, ...] up to the root.
 * A company that services a *parent* region (e.g. picked "수원시 영통구"
 * as a whole) should still show up for a customer browsing any of its
 * child 동 — so search/reservation matching checks a customer's region
 * against this whole ancestor chain, not just the exact leaf id. Bounded
 * by the region tree's depth (currently 3 levels), so this is at most 2
 * extra single-row lookups, not a recursive/unbounded walk.
 */
/**
 * Resolves a 시/도 -> 시/군/구 -> 읍/면/동 name path (as returned by Kakao's
 * coord2regioncode 법정동 lookup) to a seeded Region row. Kakao already
 * combines 시+구 into region_2depth_name the same way regions-nationwide.json
 * does ("수원시 영통구"), so this is a plain 3-level name match — no fuzzy
 * matching needed. 세종특별자치시 has no 시/군/구 layer, so Kakao returns an
 * empty region_2depth_name there; the seed script gave it a synthetic
 * SIGUNGU node named the same as the SIDO to cover exactly this case.
 */
export async function findRegionByAddressPath(
  sidoName: string,
  sigunguName: string,
  dongName: string
) {
  const sido = await prisma.region.findFirst({
    where: { level: "SIDO", parentId: null, name: sidoName },
  });
  if (!sido) return null;

  const sigungu = await prisma.region.findFirst({
    where: { level: "SIGUNGU", parentId: sido.id, name: sigunguName || sidoName },
  });
  if (!sigungu) return null;

  return prisma.region.findFirst({
    where: { level: "EUPMYEONDONG", parentId: sigungu.id, name: dongName },
  });
}

export async function getRegionAncestorIds(regionId: string): Promise<string[]> {
  const ids = [regionId];
  let currentId: string | null = regionId;
  while (currentId) {
    const current: { parentId: string | null } | null = await prisma.region.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!current?.parentId) break;
    ids.push(current.parentId);
    currentId = current.parentId;
  }
  return ids;
}
