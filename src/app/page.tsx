import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { searchCompaniesForRegion } from "@/lib/company-search";
import { CategoryNavBar } from "@/components/category-nav-bar";
import { CompanyListCard } from "@/components/company-list-card";

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "rating_desc", label: "평점순" },
  { value: "price_asc", label: "가격낮은순" },
  { value: "price_desc", label: "가격높은순" },
] as const;

const MAX_PRICE_OPTIONS = [
  { value: "", label: "가격 전체" },
  { value: "100000", label: "10만원 이하" },
  { value: "200000", label: "20만원 이하" },
  { value: "300000", label: "30만원 이하" },
];

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function buildQuery(sort: string, maxPrice: string) {
  const params = new URLSearchParams();
  if (sort && sort !== "latest") params.set("sort", sort);
  if (maxPrice) params.set("maxPrice", maxPrice);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; maxPrice?: string }>;
}) {
  const { sort: rawSort, maxPrice: rawMaxPrice } = await searchParams;
  const sort: SortValue = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? (rawSort as SortValue)
    : "latest";
  const maxPrice = rawMaxPrice ? Number(rawMaxPrice) : undefined;

  const [categories, region] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    getSelectedRegion(),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <section className="mb-4">
        <h1 className="text-lg font-bold">어떤 청소가 필요하세요?</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {region?.name ?? "우리 동네"} 업체를 보여드려요
        </p>
      </section>

      <CategoryNavBar categories={categories} activeSlug={null} />

      {!region ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          먼저 지역을 선택해주세요.
          <Link href="/regions" className="mt-3 block underline">
            지역 선택하러 가기
          </Link>
        </p>
      ) : (
        <HomeResults region={region} sort={sort} rawMaxPrice={rawMaxPrice} maxPrice={maxPrice} />
      )}
    </main>
  );
}

async function HomeResults({
  region,
  sort,
  rawMaxPrice,
  maxPrice,
}: {
  region: { id: string; name: string };
  sort: SortValue;
  rawMaxPrice?: string;
  maxPrice?: number;
}) {
  const result = await searchCompaniesForRegion({ regionId: region.id, maxPrice, sort });
  if (result.status === "region_not_found") {
    return (
      <p className="mt-10 text-center text-sm text-neutral-500">
        먼저 지역을 선택해주세요.
        <Link href="/regions" className="mt-3 block underline">
          지역 선택하러 가기
        </Link>
      </p>
    );
  }

  const { rows } = result;

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {SORT_OPTIONS.map((o) => (
            <Link
              key={o.value}
              href={`/${buildQuery(o.value, rawMaxPrice ?? "")}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                sort === o.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>

        <form method="get" className="shrink-0">
          <input type="hidden" name="sort" value={sort === "latest" ? "" : sort} />
          <select
            name="maxPrice"
            defaultValue={rawMaxPrice ?? ""}
            className="rounded-full border border-neutral-200 px-2 py-1.5 text-xs"
          >
            {MAX_PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          아직 {region.name}에 등록된 업체가 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((company) => (
            <li key={company.id}>
              <CompanyListCard
                id={company.id}
                name={company.name}
                mainImageUrl={company.mainImageUrl}
                isAvailable={company.isAvailable}
                introText={company.introText}
                price={company.price}
                rating={company.rating}
                reviewCount={company.reviewCount}
                regionNames={company.regionNames}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
