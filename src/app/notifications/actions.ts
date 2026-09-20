"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/company-auth";
import { markAllNotificationsReadForUser, markNotificationReadForUser } from "@/lib/notification";

/** Marks the notification read (only if it's the caller's own) and sends
 * them to whatever it points at — the reservation, chat, or review page. */
export async function openNotification(formData: FormData) {
  const session = await requireSession();

  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string") return;

  const result = await markNotificationReadForUser(session.user.id, notificationId);
  redirect(result?.link ?? "/notifications");
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  await markAllNotificationsReadForUser(session.user.id);
  revalidatePath("/notifications");
}
