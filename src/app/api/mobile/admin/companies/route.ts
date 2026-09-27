import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { listCompaniesForAdminMobile, parseCompanyStatusFilter } from "@/lib/admin-company-service";

/** Mobile equivalent of the web /admin/companies list, optionally filtered
 * by ?status=PENDING|ACTIVE|SUSPENDED (omitted = every status). */
export async function GET(request: Request) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = parseCompanyStatusFilter(searchParams.get("status"));
  const companies = await listCompaniesForAdminMobile(status);

  return NextResponse.json({ companies });
}
