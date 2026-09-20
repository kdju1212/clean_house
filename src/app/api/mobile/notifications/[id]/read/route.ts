import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { markNotificationReadForUser } from "@/lib/notification";

/** Mobile equivalent of the web notifications page's openNotification —
 * marks it read and hands back where it points so the app can navigate. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const result = await markNotificationReadForUser(userId, id);
  if (!result) {
    return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ link: result.link });
}
