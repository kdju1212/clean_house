import "server-only";
import { prisma } from "@/lib/prisma";
import { requireChatAccess } from "@/lib/chat";
import { notifyNewChatMessage } from "@/lib/notification";

const MAX_MESSAGE_LENGTH = 1000;

// DB-backed instead of an in-memory counter: this deploys as Vercel
// serverless functions, where separate invocations can land on different
// instances, so a process-local Map wouldn't reliably enforce a per-user
// limit. A count() against the (senderId, createdAt) index is cheap and
// needs no new infra (Redis, etc.) beyond the Postgres already in use.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 20;

export type ChatServiceResult<T> = T | { error: string; status: number };

/**
 * Shared by the web chat API route and the mobile one — same access check,
 * same read-marking behavior. Callers differ only in how they authenticate
 * the caller (cookie session vs bearer token).
 */
export async function getChatMessagesForUser(
  reservationId: string,
  userId: string
): Promise<
  ChatServiceResult<{
    messages: { id: string; senderId: string; content: string; createdAt: string }[];
  }>
> {
  const access = await requireChatAccess(reservationId, userId);
  if (!access) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  const messages = await prisma.chatMessage.findMany({
    where: { chatRoomId: access.chatRoomId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Viewing the thread marks the other side's messages as read.
  await prisma.chatMessage.updateMany({
    where: {
      chatRoomId: access.chatRoomId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return {
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function sendChatMessageForUser(
  reservationId: string,
  userId: string,
  rawContent: unknown
): Promise<
  ChatServiceResult<{
    message: { id: string; senderId: string; content: string; createdAt: string };
  }>
> {
  const access = await requireChatAccess(reservationId, userId);
  if (!access) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  const recentCount = await prisma.chatMessage.count({
    where: {
      senderId: userId,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  if (recentCount >= RATE_LIMIT_MAX_MESSAGES) {
    return {
      error: "메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 시도해주세요.",
      status: 429,
    };
  }

  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (content.length === 0) {
    return { error: "메시지를 입력해주세요.", status: 400 };
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { error: "메시지가 너무 길어요.", status: 400 };
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatRoomId: access.chatRoomId,
      senderId: userId,
      content,
    },
  });

  const recipientId = access.isCustomer
    ? access.reservation.company.ownerUserId
    : access.reservation.customerId;
  await notifyNewChatMessage({
    userId: recipientId,
    link: `/reservations/${reservationId}/chat`,
    preview: content.slice(0, 80),
  });

  return {
    message: {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  };
}
