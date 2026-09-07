import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { selectRegion } from "./actions";

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

      <form action={selectRegion} className="mt-6 flex flex-col gap-2">
        {regions.map((region) => (
          <label
            key={region.id}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm has-checked:border-neutral-900"
          >
            <input
              type="radio"
              name="regionId"
              value={region.id}
              defaultChecked={region.id === selected?.id}
            />
            {region.name}
          </label>
        ))}
        <button
          type="submit"
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          선택 완료
        </button>
      </form>
    </main>
  );
}
