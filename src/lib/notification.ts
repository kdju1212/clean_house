import "server-only";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

type NotificationType =
  | "RESERVATION_REQUESTED"
  | "RESERVATION_ACCEPTED"
  | "RESERVATION_REJECTED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_COMPLETED"
  | "RESERVATION_NO_SHOW"
  | "CHAT_MESSAGE"
  | "REVIEW_REQUEST";

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, string> = {
  RESERVATION_REQUESTED: "📥",
  RESERVATION_ACCEPTED: "✅",
  RESERVATION_REJECTED: "❌",
  RESERVATION_CANCELLED: "🚫",
  RESERVATION_COMPLETED: "🧹",
  RESERVATION_NO_SHOW: "🚷",
  CHAT_MESSAGE: "💬",
  REVIEW_REQUEST: "⭐",
};

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });

  // Every in-app notification also fires a push if the recipient has the
  // mobile app installed with a registered device token — see
  // src/lib/push.ts for why this never throws back into the caller.
  await sendPushNotification(input.userId, {
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/**
 * Chat messages arrive in bursts while both sides are polling — rather than
 * creating one notification per message, bump the existing unread one for
 * this chat thread so the recipient sees a single up-to-date entry.
 */
export async function notifyNewChatMessage(input: {
  userId: string;
  link: string;
  preview: string;
}) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId: input.userId,
      type: "CHAT_MESSAGE",
      link: input.link,
      isRead: false,
    },
  });

  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: { body: input.preview, createdAt: new Date() },
    });
    // Still push for every message even though the in-app row was bumped
    // rather than recreated — a silent chat notification would defeat the
    // point of a "new message" alert.
    await sendPushNotification(input.userId, {
      title: "새 메시지가 도착했어요",
      body: input.preview,
      link: input.link,
    });
    return;
  }

  await createNotification({
    userId: input.userId,
    type: "CHAT_MESSAGE",
    title: "새 메시지가 도착했어요",
    body: input.preview,
    link: input.link,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
