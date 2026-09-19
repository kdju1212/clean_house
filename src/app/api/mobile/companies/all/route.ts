import { NextResponse } from "next/server";
import { searchCompaniesForRegion, type CompanySearchSort } from "@/lib/company-search";

const SORT_VALUES: CompanySearchSort[] = [
  "latest",
  "rating_desc",
  "price_asc",
  "price_desc",
];

/** Mobile equivalent of the web home page's "전체" tab — every ACTIVE
 * company serving the given region across all categories. See
 * /api/mobile/categories/[slug]/companies for the single-category version. */
export async function GET(request: Request) {
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

  const result = await searchCompaniesForRegion({ regionId, maxPrice, sort });

  if (result.status === "region_not_found") {
    return NextResponse.json({ error: "존재하지 않는 지역입니다." }, { status: 404 });
  }

  return NextResponse.json({ region: result.region, rows: result.rows });
}
