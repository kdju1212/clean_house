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
