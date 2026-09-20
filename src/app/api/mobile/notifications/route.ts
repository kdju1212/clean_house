import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { listNotificationsForUser } from "@/lib/notification";

/** Mobile equivalent of the web /notifications page's data. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const notifications = await listNotificationsForUser(userId);
  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
