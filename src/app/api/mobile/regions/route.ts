import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns the full region picker tree for the app to render however it
 * wants (grouped list, cascading picker, etc.) — mirrors what /regions and
 * /company render server-side for the web, just as data instead of HTML.
 * The tree is only 3 levels deep by design (see Region model), so a single
 * nested include is enough — no recursive query needed.
 */
export async function GET() {
  const [sidoRegions, legacyRegions] = await Promise.all([
    prisma.region.findMany({
      where: { level: "SIDO" },
      orderBy: { order: "asc" },
      include: {
        children: {
          orderBy: { order: "asc" },
          include: { children: { orderBy: { order: "asc" } } },
        },
      },
    }),
    // Pre-hierarchy flat regions (no parent, still EUPMYEONDONG level) —
    // selectable directly, same as the web "기타" group.
    prisma.region.findMany({
      where: { level: "EUPMYEONDONG", parentId: null },
      orderBy: { order: "asc" },
    }),
  ]);

  return NextResponse.json({
    sido: sidoRegions.map((sido) => ({
      id: sido.id,
      name: sido.name,
      children: sido.children.map((sigungu) => ({
        id: sigungu.id,
        name: sigungu.name,
        children: sigungu.children.map((dong) => ({
          id: dong.id,
          name: dong.name,
        })),
      })),
    })),
    legacyRegions: legacyRegions.map((r) => ({ id: r.id, name: r.name })),
  });
}
