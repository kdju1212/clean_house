import "server-only";
import { prisma } from "@/lib/prisma";
import { requireChatAccess } from "@/lib/chat";
import { RESERVATION_ITEMS_INCLUDE, reservationServiceNames } from "@/lib/reservation";
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

/**
 * Every chat thread the caller is a party to, as either the customer who
 * booked or the owner of the company being booked — the same account can
 * be both across different reservations now that a COMPANY-role account
 * still browses/books like any customer (see the app's 내 채팅 tab).
 * Sorted by most recent activity (last message, or the reservation's own
 * createdAt for a thread nobody has written in yet).
 */
export async function getMyChatRooms(userId: string): Promise<
  {
    reservationId: string;
    otherPartyName: string;
    categoryName: string;
    lastMessage: string | null;
    lastMessageAt: string;
    unreadCount: number;
  }[]
> {
  const rooms = await prisma.chatRoom.findMany({
    where: {
      reservation: {
        OR: [{ customerId: userId }, { company: { ownerUserId: userId } }],
      },
    },
    include: {
      reservation: { include: { company: true, items: RESERVATION_ITEMS_INCLUDE } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const unreadCounts =
    rooms.length > 0
      ? await prisma.chatMessage.groupBy({
          by: ["chatRoomId"],
          where: {
            chatRoomId: { in: rooms.map((r) => r.id) },
            senderId: { not: userId },
            isRead: false,
          },
          _count: true,
        })
      : [];
  const unreadMap = new Map(unreadCounts.map((c) => [c.chatRoomId, c._count]));

  return rooms
    .map((room) => {
      const isCustomer = room.reservation.customerId === userId;
      const lastMessage = room.messages[0] ?? null;
      return {
        reservationId: room.reservationId,
        otherPartyName: isCustomer ? room.reservation.company.name : room.reservation.customerName,
        categoryName: reservationServiceNames(room.reservation.items),
        lastMessage: lastMessage?.content ?? null,
        lastMessageAt: (lastMessage?.createdAt ?? room.createdAt).toISOString(),
        unreadCount: unreadMap.get(room.id) ?? 0,
      };
    })
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
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
