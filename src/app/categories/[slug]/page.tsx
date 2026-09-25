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
import { SearchIcon } from "@/components/icons";

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

function buildQuery(sort: string, maxPrice: string, q: string) {
  const params = new URLSearchParams();
  if (sort && sort !== "latest") params.set("sort", sort);
  if (maxPrice) params.set("maxPrice", maxPrice);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function CategoryCompaniesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; maxPrice?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { sort: rawSort, maxPrice: rawMaxPrice, q: rawQuery } = await searchParams;

  const sort: SortValue = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? (rawSort as SortValue)
    : "latest";
  const maxPrice = rawMaxPrice ? Number(rawMaxPrice) : undefined;
  const query = rawQuery?.trim() || undefined;

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
    searchCompaniesInCategory({ slug, regionId: region.id, maxPrice, sort, categoryProfile, query }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (result.status === "category_not_found" || result.status === "region_not_found") {
    notFound();
  }

  const { category, adRows, rows } = result;
  const quantityKey = getPricingQuantityKey(slug);
  const unitLabel = quantityKey ? PRICING_UNIT_LABEL[quantityKey] : undefined;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-6">
      <h1 className="sr-only">
        {region.name} {category.name} 업체
      </h1>

      <CategoryNavBar categories={categories} activeSlug={slug} />

      <form method="get" className="mt-1 flex items-center gap-2 rounded-lg bg-[#f2f3f6] px-3">
        {sort !== "latest" && <input type="hidden" name="sort" value={sort} />}
        {rawMaxPrice && <input type="hidden" name="maxPrice" value={rawMaxPrice} />}
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-[#868b94]" />
        <input
          type="text"
          name="q"
          defaultValue={rawQuery ?? ""}
          placeholder={`${category.name} 업체 검색`}
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[#868b94]"
        />
      </form>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-x-auto text-[13px]">
          {SORT_OPTIONS.map((o) => (
            <Link
              key={o.value}
              href={`/categories/${slug}${buildQuery(o.value, rawMaxPrice ?? "", rawQuery ?? "")}`}
              className={`shrink-0 ${
                sort === o.value ? "font-bold text-neutral-900" : "text-[#868b94]"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>

        <form method="get" className="shrink-0">
          {rawQuery && <input type="hidden" name="q" value={rawQuery} />}
          <input type="hidden" name="sort" value={sort === "latest" ? "" : sort} />
          <select
            name="maxPrice"
            defaultValue={rawMaxPrice ?? ""}
            className="rounded-md bg-[#f2f3f6] px-2 py-1 text-[13px] text-neutral-700"
          >
            {MAX_PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </form>
      </div>

      {session?.user && (
        <div className="mt-2 flex justify-end">
          <CategoryProfileButton
            categorySlug={slug}
            initialAnswers={categoryProfile}
            otherProfiles={allProfiles}
            categories={categories}
          />
        </div>
      )}

      {adRows.length > 0 && (
        <ul className="mt-1 flex flex-col divide-y divide-neutral-100 border-b border-neutral-100">
          {adRows.map((company) => (
            <li key={`ad-${company.id}`}>
              <CompanyListCard
                id={company.id}
                categoryId={category.id}
                name={company.name}
                mainImageUrl={company.mainImageUrl}
                isAvailable={company.isAvailable}
                isVerified={company.isVerified}
                hasBusinessRegistration={company.hasBusinessRegistration}
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
        <ul className="mt-1 flex flex-col divide-y divide-neutral-100">
          {rows.map((company) => (
            <li key={company.id}>
              <CompanyListCard
                id={company.id}
                categoryId={category.id}
                name={company.name}
                mainImageUrl={company.mainImageUrl}
                isAvailable={company.isAvailable}
                isVerified={company.isVerified}
                hasBusinessRegistration={company.hasBusinessRegistration}
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
