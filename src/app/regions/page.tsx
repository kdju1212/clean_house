import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { RegionSelectForm } from "./region-select-form";

export default async function RegionsPage() {
  const [regions, selected] = await Promise.all([
    prisma.region.findMany({ orderBy: { order: "asc" } }),
    getSelectedRegion(),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">지역 선택</h1>
      <p className="mt-1 text-sm text-neutral-500">
        현재는 화성시 일부 지역만 테스트로 제공하고 있어요.
      </p>

      <RegionSelectForm regions={regions} selectedId={selected?.id} />
    </main>
  );
}
