import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import { searchCompaniesInCategory } from "@/lib/company-search";
import { getCategoryProfile, getAllCategoryProfiles } from "@/lib/category-profile-service";
import { getPricingQuantityKey, PRICING_UNIT_LABEL } from "@/lib/reservation-questions";
import { CategoryNavBar } from "@/components/category-nav-bar";
import { CompanyListCard } from "@/components/company-list-card";
import { CategoryProfileButton } from "@/components/category-profile-button";

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

  const region = await getSelectedRegion();
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

  const session = await auth();
  const [categoryProfile, allProfiles] = await Promise.all([
    session?.user ? getCategoryProfile(session.user.id, slug) : Promise.resolve(null),
    session?.user ? getAllCategoryProfiles(session.user.id) : Promise.resolve({}),
  ]);

  const [result, categories] = await Promise.all([
    searchCompaniesInCategory({ slug, regionId: region.id, maxPrice, sort, categoryProfile }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (result.status === "category_not_found" || result.status === "region_not_found") {
    notFound();
  }

  const { category, adRows, rows } = result;
  const quantityKey = getPricingQuantityKey(slug);
  const unitLabel = quantityKey ? PRICING_UNIT_LABEL[quantityKey] : undefined;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-400">
            {region.name} &gt; {category.name}
          </p>
          <h1 className="mt-1 text-lg font-bold">{category.name} 업체</h1>
        </div>
        {session?.user && (
          <CategoryProfileButton
            categorySlug={slug}
            initialAnswers={categoryProfile}
            otherProfiles={allProfiles}
            categories={categories}
          />
        )}
      </div>

      <div className="mt-3">
        <CategoryNavBar categories={categories} activeSlug={slug} />
      </div>

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
                pricingUnit={company.pricingUnit}
                estimatedPrice={company.estimatedPrice}
                unitLabel={unitLabel}
                rating={company.rating}
                reviewCount={company.reviewCount}
                regionNames={company.regionNames}
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
                pricingUnit={company.pricingUnit}
                estimatedPrice={company.estimatedPrice}
                unitLabel={unitLabel}
                rating={company.rating}
                reviewCount={company.reviewCount}
                regionNames={company.regionNames}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
