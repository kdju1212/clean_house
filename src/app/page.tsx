import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";

const EMOJI_BY_SLUG: Record<string, string> = {
  "move-in": "🏠",
  moving: "📦",
  residential: "🧹",
  office: "🏢",
  restaurant: "🍽️",
  store: "🏬",
  aircon: "❄️",
  washer: "🧺",
  etc: "✨",
};

export default async function Home() {
  const [categories, region] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    getSelectedRegion(),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <section className="mb-6">
        <h1 className="text-lg font-bold">어떤 청소가 필요하세요?</h1>
        <p className="mt-1 text-sm text-neutral-500">
          청소 종류를 선택하면 {region?.name ?? "우리 동네"} 업체를
          보여드려요
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white py-5 text-sm font-medium shadow-sm active:scale-95"
          >
            <span className="text-2xl" aria-hidden>
              {EMOJI_BY_SLUG[c.slug] ?? "🧽"}
            </span>
            {c.name}
          </Link>
        ))}
      </section>
    </main>
  );
}
