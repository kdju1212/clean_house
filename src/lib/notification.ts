import "server-only";
import { prisma } from "@/lib/prisma";

type NotificationType =
  | "RESERVATION_REQUESTED"
  | "RESERVATION_ACCEPTED"
  | "RESERVATION_REJECTED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_COMPLETED"
  | "CHAT_MESSAGE"
  | "REVIEW_REQUEST";

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, string> = {
  RESERVATION_REQUESTED: "📥",
  RESERVATION_ACCEPTED: "✅",
  RESERVATION_REJECTED: "❌",
  RESERVATION_CANCELLED: "🚫",
  RESERVATION_COMPLETED: "🧹",
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
