import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
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

export default async function CategoryCompaniesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; maxPrice?: string }>;
}) {
  const { slug } = await params;
  const { sort: rawSort, maxPrice: rawMaxPrice } = await searchParams;

  const sort: SortValue = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? (rawSort as SortValue)
    : "latest";
  const maxPrice = rawMaxPrice ? Number(rawMaxPrice) : undefined;

  const [category, region] = await Promise.all([
    prisma.category.findUnique({ where: { slug } }),
    getSelectedRegion(),
  ]);

  if (!category) notFound();
  if (!region) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 text-center text-sm text-neutral-500">
        먼저 지역을 선택해주세요.
        <Link href="/regions" className="mt-3 block underline">
          지역 선택하러 가기
        </Link>
      </main>
    );
  }

  const companies = await prisma.company.findMany({
    where: {
      status: "ACTIVE",
      regions: { some: { regionId: region.id } },
      services: {
        some: {
          categoryId: category.id,
          ...(maxPrice ? { price: { lte: maxPrice } } : {}),
        },
      },
    },
    include: {
      services: { where: { categoryId: category.id } },
      regions: { include: { region: true } },
    },
  });

  const rows = companies
    .map((c) => ({ ...c, price: c.services[0]?.price ?? 0 }))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-neutral-400">
        {region.name} &gt; {category.name}
      </p>
      <h1 className="mt-1 text-lg font-bold">{category.name} 업체</h1>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {SORT_OPTIONS.map((o) => (
            <Link
              key={o.value}
              href={`/categories/${slug}${buildQuery(o.value, rawMaxPrice ?? "")}`}
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
          아직 {region.name}에 등록된 {category.name} 업체가 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((company) => (
            <li key={company.id}>
              <Link
                href={`/companies/${company.id}`}
                className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {company.mainImageUrl ? (
                    <Image
                      src={company.mainImageUrl}
                      alt={company.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">
                      🧽
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{company.name}</p>
                    {!company.isAvailable && (
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                        예약 마감
                      </span>
                    )}
                  </div>
                  {company.introText && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {company.introText}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold">
                    {company.price.toLocaleString()}원~
                  </p>
                  <p className="mt-auto truncate text-[11px] text-neutral-400">
                    {company.regions.map((r) => r.region.name).join(", ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
