import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { RegionSelectForm } from "./region-select-form";

export default async function RegionsPage() {
  const [leafRegions, selected] = await Promise.all([
    // Customers always pick a 동 — 시/도, 시/군/구 rows exist only so
    // companies can cover a whole area at once (see setRegions).
    prisma.region.findMany({
      where: { level: "EUPMYEONDONG" },
      include: { parent: true },
      orderBy: [{ parentId: "asc" }, { order: "asc" }],
    }),
    getSelectedRegion(),
  ]);

  // Group by parent 시/군/구 for readability; the handful of pre-hierarchy
  // flat regions (parent: null) fall under "기타".
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const region of leafRegions) {
    const groupLabel = region.parent?.name ?? "기타";
    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel)!.push({ id: region.id, name: region.name });
  }
  const groupedRegions = [...groups.entries()].map(([label, regions]) => ({
    label,
    regions,
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">지역 선택</h1>
      <p className="mt-1 text-sm text-neutral-500">
        현재는 일부 지역만 테스트로 제공하고 있어요.
      </p>

      <RegionSelectForm groupedRegions={groupedRegions} selectedId={selected?.id} />
    </main>
  );
}
