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

export type RegionSearchHit = { id: string; name: string; label: string };

/**
 * Region-name search for the region picker, done in the DB instead of
 * shipping all ~5,000 읍/면/동 rows to the client and filtering there —
 * that was the whole tree serialized into every /regions page load
 * regardless of whether the visitor ever typed a search query, which is
 * what actually made the page slow (not the DB query itself — Neon and the
 * app run in the same region). Splits the query into words and requires
 * each word to match *somewhere* in the row's own name, its 시/군/구, or
 * its 시/도 (independently, not all in the same field) — a query like
 * "광진구 화양동" has no single field containing that whole two-word
 * string, so a single combined `contains` would never match it even
 * though the row plainly is 광진구 화양동. Capped to `limit` results.
 */
export async function searchRegions(query: string, limit = 30): Promise<RegionSearchHit[]> {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const rows = await prisma.region.findMany({
    where: {
      level: "EUPMYEONDONG",
      AND: words.map((word) => ({
        OR: [
          { name: { contains: word, mode: "insensitive" as const } },
          { parent: { name: { contains: word, mode: "insensitive" as const } } },
          { parent: { parent: { name: { contains: word, mode: "insensitive" as const } } } },
        ],
      })),
    },
    include: { parent: { include: { parent: true } } },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    // "시/군/구 동" only, matching how the rest of the site labels a
    // region — no 시/도 prefix (e.g. "광진구 화양동", not "서울특별시
    // 광진구 화양동").
    label: row.parent ? `${row.parent.name} ${row.name}` : row.name,
  }));
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
