import "server-only";
import { prisma } from "@/lib/prisma";
import { getRegionAncestorIds } from "@/lib/region";
import { startOfToday } from "@/lib/ad";
import { getPricingQuantityKey } from "@/lib/reservation-questions";

export type CompanySearchSort =
  | "latest"
  | "rating_desc"
  | "price_asc"
  | "price_desc";

export type CompanySearchRow = {
  id: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  introText: string | null;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  // Non-null only when pricingUnit is PER_UNIT and the caller passed a
  // categoryProfile with a value for this category's quantity question
  // (see getPricingQuantityKey) — price * that quantity, e.g. 32평 x
  // 10,000원/평. Never affects sorting/maxPrice filtering, which stay
  // based on the listed `price` so every company is compared on the same
  // basis regardless of who's browsing.
  estimatedPrice: number | null;
  rating: number;
  reviewCount: number;
  regionNames: string[];
};

export type CompanySearchResult =
  | { status: "category_not_found" }
  | { status: "region_not_found" }
  | {
      status: "ok";
      category: { id: string; slug: string; name: string };
      region: { id: string; name: string };
      adRows: CompanySearchRow[];
      rows: CompanySearchRow[];
    };

type CompanyWithRegions = {
  id: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  introText: string | null;
  regions: { region: { name: string } }[];
};

export type CompanySearchAllResult =
  | { status: "region_not_found" }
  | {
      status: "ok";
      region: { id: string; name: string };
      rows: CompanySearchRow[];
    };

/**
 * The 홈 화면's "전체" tab — every ACTIVE company serving the customer's
 * region, across every category, instead of one category's. No ad section
 * here: a company's CPT slot is paid for a specific category's results
 * page, not a general placement, so ads stay scoped to
 * searchCompaniesInCategory. "가격" shows each company's cheapest service
 * (their "시작가") since they may offer several categories at different
 * prices.
 */
export async function searchCompaniesForRegion({
  regionId,
  maxPrice,
  sort,
}: {
  regionId: string;
  maxPrice?: number;
  sort: CompanySearchSort;
}): Promise<CompanySearchAllResult> {
  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) return { status: "region_not_found" };

  const ancestorRegionIds = await getRegionAncestorIds(region.id);

  const companies = await prisma.company.findMany({
    where: {
      status: "ACTIVE",
      regions: { some: { regionId: { in: ancestorRegionIds } } },
      ...(maxPrice ? { services: { some: { price: { lte: maxPrice } } } } : {}),
    },
    include: {
      services: true,
      regions: { include: { region: true } },
    },
  });

  const ratingByCompanyId =
    companies.length > 0
      ? await prisma.review.groupBy({
          by: ["companyId"],
          where: { companyId: { in: companies.map((c) => c.id) }, hidden: false },
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

  const rows = companies
    .map((c) => {
      const eligiblePrices = (
        maxPrice ? c.services.filter((s) => s.price <= maxPrice) : c.services
      ).map((s) => s.price);
      const price = eligiblePrices.length > 0 ? Math.min(...eligiblePrices) : 0;
      return {
        row: {
          id: c.id,
          name: c.name,
          mainImageUrl: c.mainImageUrl,
          isAvailable: c.isAvailable,
          introText: c.introText,
          price,
          // "전체" mixes every category a company offers into one "시작가"
          // — there's no single category context to estimate against, so
          // this tab never shows a PER_UNIT estimate (that's
          // searchCompaniesInCategory's job).
          pricingUnit: "FLAT",
          estimatedPrice: null,
          rating: ratingMap.get(c.id)?.average ?? 0,
          reviewCount: ratingMap.get(c.id)?.count ?? 0,
          regionNames: c.regions.map((r) => r.region.name),
        } satisfies CompanySearchRow,
        createdAt: c.createdAt,
      };
    })
    .sort((a, b) => {
      if (sort === "price_asc") return a.row.price - b.row.price;
      if (sort === "price_desc") return b.row.price - a.row.price;
      if (sort === "rating_desc") return b.row.rating - a.row.rating;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .map((x) => x.row);

  return { status: "ok", region: { id: region.id, name: region.name }, rows };
}

/**
 * Shared by the web category page and the mobile companies API route — same
 * region-ancestor expansion (a company covering a parent 시/군/구 still
 * matches a customer in any of its child 동), same "ads skip the price
 * filter, organic doesn't" policy split, same ad/organic dedup and rating
 * join. Only the caller (RSC page vs JSON API route) differs in how it
 * renders the result.
 */
export async function searchCompaniesInCategory({
  slug,
  regionId,
  maxPrice,
  sort,
  categoryProfile,
}: {
  slug: string;
  regionId: string;
  maxPrice?: number;
  sort: CompanySearchSort;
  // The browsing customer's saved CategoryProfile for this category, if
  // any — used only to compute estimatedPrice for PER_UNIT services.
  categoryProfile?: Record<string, string> | null;
}): Promise<CompanySearchResult> {
  const [category, region] = await Promise.all([
    prisma.category.findUnique({ where: { slug } }),
    prisma.region.findUnique({ where: { id: regionId } }),
  ]);

  if (!category) return { status: "category_not_found" };
  if (!region) return { status: "region_not_found" };

  const quantityKey = getPricingQuantityKey(slug);
  const quantityValue =
    quantityKey && categoryProfile?.[quantityKey] ? Number(categoryProfile[quantityKey]) : null;

  const ancestorRegionIds = await getRegionAncestorIds(region.id);

  const [companies, ads] = await Promise.all([
    prisma.company.findMany({
      where: {
        status: "ACTIVE",
        regions: { some: { regionId: { in: ancestorRegionIds } } },
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
    // CPT ad slots for this category — only currently-running ones, and only
    // for companies that are still ACTIVE and actually serve the customer's
    // selected region, same as the organic listing above (but no price
    // filter — ads are paid placements, shown regardless of price).
    prisma.advertisement.findMany({
      where: {
        categoryId: category.id,
        cancelled: false,
        startDate: { lte: startOfToday() },
        endDate: { gte: startOfToday() },
        company: {
          status: "ACTIVE",
          regions: { some: { regionId: { in: ancestorRegionIds } } },
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

  function toRow(
    company: CompanyWithRegions,
    service: { price: number; pricingUnit: "FLAT" | "PER_UNIT" } | undefined
  ): CompanySearchRow {
    const price = service?.price ?? 0;
    const pricingUnit = service?.pricingUnit ?? "FLAT";
    const estimatedPrice =
      pricingUnit === "PER_UNIT" && quantityValue != null && Number.isFinite(quantityValue) && quantityValue > 0
        ? price * quantityValue
        : null;
    return {
      id: company.id,
      name: company.name,
      mainImageUrl: company.mainImageUrl,
      isAvailable: company.isAvailable,
      introText: company.introText,
      price,
      pricingUnit,
      estimatedPrice,
      rating: ratingMap.get(company.id)?.average ?? 0,
      reviewCount: ratingMap.get(company.id)?.count ?? 0,
      regionNames: company.regions.map((r) => r.region.name),
    };
  }

  const adRows = ads.map((ad) => toRow(ad.company, ad.company.services[0]));

  const rows = organicCompanies
    .map((c) => ({
      row: toRow(c, c.services[0]),
      createdAt: c.createdAt,
    }))
    .sort((a, b) => {
      if (sort === "price_asc") return a.row.price - b.row.price;
      if (sort === "price_desc") return b.row.price - a.row.price;
      if (sort === "rating_desc") return b.row.rating - a.row.rating;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .map((x) => x.row);

  return {
    status: "ok",
    category: { id: category.id, slug: category.slug, name: category.name },
    region: { id: region.id, name: region.name },
    adRows,
    rows,
  };
}
