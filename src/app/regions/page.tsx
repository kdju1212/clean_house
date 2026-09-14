import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { RegionSelectForm } from "./region-select-form";

export default async function RegionsPage() {
  // Search now happens server-side per keystroke (see /api/mobile/regions/search)
  // instead of shipping every one of the ~5,000 읍/면/동 rows down on every
  // page load just so the client could filter them locally — that full-tree
  // payload was what made this page slow, not the DB query itself. Only the
  // handful of pre-hierarchy flat regions are still fetched eagerly, as a
  // quick-pick fallback for a visitor who hasn't typed anything yet.
  const [legacyRegions, selected] = await Promise.all([
    prisma.region.findMany({
      where: { level: "EUPMYEONDONG", parentId: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    getSelectedRegion(),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">지역 선택</h1>
      <p className="mt-1 text-sm text-neutral-500">
        전국 어디든 동네를 선택할 수 있어요.
      </p>

      <RegionSelectForm
        legacyRegions={legacyRegions}
        selectedId={selected?.id}
        selectedName={selected?.name}
      />
    </main>
  );
}
