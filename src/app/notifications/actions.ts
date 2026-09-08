"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";

/** Marks the notification read (only if it's the caller's own) and sends
 * them to whatever it points at — the reservation, chat, or review page. */
export async function openNotification(formData: FormData) {
  const session = await requireSession();

  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string") return;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.userId !== session.user.id) {
    redirect("/notifications");
  }

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
  }

  redirect(notification.link ?? "/notifications");
}

export async function markAllNotificationsRead() {
  const session = await requireSession();

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}
