import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { listReportsForAdminMobile, parseReportStatusFilter } from "@/lib/admin-report-service";

/** Mobile equivalent of the web /admin/reports list — ?status=PENDING
 * (default) or RESOLVED. */
export async function GET(request: Request) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = parseReportStatusFilter(searchParams.get("status"));
  const reports = await listReportsForAdminMobile(status);

  return NextResponse.json({ reports });
}
