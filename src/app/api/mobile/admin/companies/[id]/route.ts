import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { getCompanyDetailForAdminMobile } from "@/lib/admin-company-service";

/** Mobile equivalent of the web /admin/companies/[id] detail page. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const company = await getCompanyDetailForAdminMobile(id);
  if (!company) {
    return NextResponse.json({ error: "존재하지 않는 업체예요." }, { status: 404 });
  }

  return NextResponse.json({ company });
}
