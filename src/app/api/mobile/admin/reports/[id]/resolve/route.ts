import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { resolveReportForAdmin } from "@/lib/admin-report-service";

/** Mobile equivalent of the web /admin/reports resolveReport action. Body:
 * { action: "hide" | "dismiss" | "suspend" }. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await resolveReportForAdmin(id, body?.action);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
