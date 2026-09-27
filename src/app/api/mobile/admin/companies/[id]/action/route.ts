import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import {
  approveCompanyForAdmin,
  reactivateCompanyForAdmin,
  setCompanyVerifiedForAdmin,
  suspendCompanyForAdmin,
} from "@/lib/admin-company-service";

const ACTIONS = ["approve", "suspend", "reactivate", "verify", "unverify"] as const;

/** Mobile equivalent of admin/companies' Server Actions (approve/suspend/
 * reactivate/verify/unverify) — one endpoint, `action` in the body picks
 * which, same as the report-resolve endpoint's shape. Body for "suspend"
 * also needs `reason`. */
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
  const action = body?.action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "잘못된 처리 방식이에요." }, { status: 400 });
  }

  const result =
    action === "approve"
      ? await approveCompanyForAdmin(id)
      : action === "suspend"
        ? await suspendCompanyForAdmin(id, body?.reason)
        : action === "reactivate"
          ? await reactivateCompanyForAdmin(id)
          : await setCompanyVerifiedForAdmin(id, action === "verify");

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
