import { NextResponse } from "next/server";
import { searchCompaniesInCategory, type CompanySearchSort } from "@/lib/company-search";
import { getCategoryProfile } from "@/lib/category-profile-service";
import { getMobileUserId } from "@/lib/mobile-auth";

const SORT_VALUES: CompanySearchSort[] = [
  "latest",
  "rating_desc",
  "price_asc",
  "price_desc",
];

/**
 * Mobile equivalent of /categories/[slug] — same search logic (region
 * ancestor expansion, ad/organic split, price filter policy), just returned
 * as JSON instead of rendered HTML. The app has no cookie-based selected
 * region like the web does, so it must pass `regionId` explicitly (it keeps
 * the user's choice in local storage after picking it from /api/mobile/regions).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const regionId = url.searchParams.get("regionId");
  const maxPriceRaw = url.searchParams.get("maxPrice");
  const sortRaw = url.searchParams.get("sort");

  if (!regionId) {
    return NextResponse.json({ error: "regionId가 필요합니다." }, { status: 400 });
  }

  const sort: CompanySearchSort = SORT_VALUES.includes(sortRaw as CompanySearchSort)
    ? (sortRaw as CompanySearchSort)
    : "latest";
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  // Browsing works signed-out too, so a missing/invalid token isn't an
  // error here — it just means no PER_UNIT estimate can be computed.
  const userId = await getMobileUserId(request);
  const categoryProfile = userId ? await getCategoryProfile(userId, slug) : null;

  const result = await searchCompaniesInCategory({ slug, regionId, maxPrice, sort, categoryProfile });

  if (result.status === "category_not_found") {
    return NextResponse.json({ error: "존재하지 않는 카테고리입니다." }, { status: 404 });
  }
  if (result.status === "region_not_found") {
    return NextResponse.json({ error: "존재하지 않는 지역입니다." }, { status: 404 });
  }

  return NextResponse.json({
    category: result.category,
    region: result.region,
    adRows: result.adRows,
    rows: result.rows,
  });
}
