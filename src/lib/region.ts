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
