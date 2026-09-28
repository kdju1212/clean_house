import { NextResponse } from "next/server";
import { getMobileAdminUserId } from "@/lib/mobile-auth";
import { listSupportRoomsForAdmin } from "@/lib/support-chat";

/** Mobile equivalent of the web /admin/support inbox listing. */
export async function GET(request: Request) {
  const userId = await getMobileAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const rooms = await listSupportRoomsForAdmin();
  return NextResponse.json({ rooms });
}
