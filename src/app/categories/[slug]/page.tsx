import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { startOfToday } from "@/lib/ad";
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

  const [companies, ads] = await Promise.all([
    prisma.company.findMany({
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
    }),
    // CPT ad slots for this category — only currently-running ones, and
    // only for companies that are still ACTIVE and actually serve the
    // customer's selected region, same as the organic listing above.
    prisma.advertisement.findMany({
      where: {
        categoryId: category.id,
        cancelled: false,
        startDate: { lte: startOfToday() },
        endDate: { gte: startOfToday() },
        company: {
          status: "ACTIVE",
          regions: { some: { regionId: region.id } },
        },
      },
      include: {
        company: {
          include: {
            services: { where: { categoryId: category.id } },
            regions: { include: { region: true } },
          },
        },
      },
      orderBy: { slot: "asc" },
    }),
  ]);

  const adCompanyIds = new Set(ads.map((ad) => ad.companyId));
  const organicCompanies = companies.filter((c) => !adCompanyIds.has(c.id));
  const allCompanyIds = new Set([
    ...companies.map((c) => c.id),
    ...ads.map((ad) => ad.companyId),
  ]);

  const ratingByCompanyId =
    allCompanyIds.size > 0
      ? await prisma.review.groupBy({
          by: ["companyId"],
          where: { companyId: { in: [...allCompanyIds] }, hidden: false },
          _avg: { rating: true },
          _count: true,
        })
      : [];
  const ratingMap = new Map(
    ratingByCompanyId.map((r) => [
      r.companyId,
      { average: r._avg.rating ?? 0, count: r._count },
    ])
  );

  const adRows = ads.map((ad) => ({
    ...ad.company,
    price: ad.company.services[0]?.price ?? 0,
    rating: ratingMap.get(ad.companyId)?.average ?? 0,
    reviewCount: ratingMap.get(ad.companyId)?.count ?? 0,
  }));

  const rows = organicCompanies
    .map((c) => ({
      ...c,
      price: c.services[0]?.price ?? 0,
      rating: ratingMap.get(c.id)?.average ?? 0,
      reviewCount: ratingMap.get(c.id)?.count ?? 0,
    }))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "rating_desc") return b.rating - a.rating;
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

      {adRows.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {adRows.map((company) => (
            <li key={`ad-${company.id}`}>
              <CompanyListCard
                id={company.id}
                name={company.name}
                mainImageUrl={company.mainImageUrl}
                isAvailable={company.isAvailable}
                introText={company.introText}
                price={company.price}
                rating={company.rating}
                reviewCount={company.reviewCount}
                regionNames={company.regions.map((r) => r.region.name)}
                isAd
              />
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 && adRows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          아직 {region.name}에 등록된 {category.name} 업체가 없어요.
        </p>
      ) : rows.length === 0 ? null : (
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
                regionNames={company.regions.map((r) => r.region.name)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
