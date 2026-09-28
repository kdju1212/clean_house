import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyNewChatMessage } from "@/lib/notification";

const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 20;

export type SupportChatServiceResult<T> = T | { error: string; status: number };

type SupportChatAccess = {
  targetUserId: string;
  isAdmin: boolean;
};

/**
 * A 고객센터 문의 room belongs to one user (any role) and is visible to that
 * user and to any admin — same "whoever answers, answers" shape as
 * requireAdminChatAccess in admin-chat.ts, just keyed by the asker's own
 * userId instead of a companyId.
 */
async function requireSupportChatAccess(
  targetUserId: string,
  callerId: string
): Promise<SupportChatAccess | null> {
  if (callerId === targetUserId) {
    return { targetUserId, isAdmin: false };
  }

  const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { role: true } });
  if (caller?.role !== "ADMIN") return null;

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return null;

  return { targetUserId, isAdmin: true };
}

/** Finds this user's room, creating it on first use — there's exactly one
 * per user, so no "which room" question ever comes up. */
async function findOrCreateRoom(targetUserId: string): Promise<{ id: string }> {
  const existing = await prisma.supportChatRoom.findUnique({ where: { userId: targetUserId } });
  if (existing) return existing;
  return prisma.supportChatRoom.create({ data: { userId: targetUserId } });
}

export async function getSupportChatMessages(
  targetUserId: string,
  callerId: string
): Promise<
  SupportChatServiceResult<{
    messages: { id: string; senderId: string; content: string; createdAt: string }[];
  }>
> {
  const access = await requireSupportChatAccess(targetUserId, callerId);
  if (!access) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  const room = await findOrCreateRoom(targetUserId);
  const messages = await prisma.supportMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Viewing the thread marks the other side's messages as read — a room
  // only ever has two kinds of senders: the asking user, and admins.
  await prisma.supportMessage.updateMany({
    where: { roomId: room.id, senderId: { not: callerId }, isRead: false },
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

export async function sendSupportMessage(
  targetUserId: string,
  callerId: string,
  rawContent: unknown
): Promise<
  SupportChatServiceResult<{
    message: { id: string; senderId: string; content: string; createdAt: string };
  }>
> {
  const access = await requireSupportChatAccess(targetUserId, callerId);
  if (!access) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  const recentCount = await prisma.supportMessage.count({
    where: { senderId: callerId, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
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

  const room = await findOrCreateRoom(targetUserId);
  const message = await prisma.supportMessage.create({
    data: { roomId: room.id, senderId: callerId, content },
  });

  if (access.isAdmin) {
    // Sent by an admin -> only the asking user needs telling.
    await notifyNewChatMessage({ userId: targetUserId, link: "/support", preview: content.slice(0, 80) });
  } else {
    // Sent by the user -> every admin needs telling, since there's no
    // per-admin assignment (see requireSupportChatAccess above).
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        notifyNewChatMessage({
          userId: admin.id,
          link: `/admin/support/${targetUserId}`,
          preview: content.slice(0, 80),
        })
      )
    );
  }

  return {
    message: {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

/**
 * Every 고객센터 문의 thread, for the admin inbox at /admin/support — same
 * "most recent activity first" shape as getMyChatRooms in chat-service.ts.
 */
export async function listSupportRoomsForAdmin(): Promise<
  {
    userId: string;
    userName: string;
    userRole: string;
    lastMessage: string | null;
    lastMessageAt: string;
    unreadCount: number;
  }[]
> {
  const rooms = await prisma.supportChatRoom.findMany({
    include: {
      user: { select: { name: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // "Unread" here always means "unread by an admin" — i.e. not sent by an
  // admin (covers the edge case of an admin's own support room too, where
  // senderId === room.userId wouldn't be the right test) — which groupBy
  // can't express per-room without a join, so this counts one room at a
  // time instead. The admin inbox's room count is small enough that N+1
  // here is fine.
  const unreadByRoom = new Map<string, number>();
  for (const room of rooms) {
    const count = await prisma.supportMessage.count({
      where: { roomId: room.id, isRead: false, sender: { role: { not: "ADMIN" } } },
    });
    unreadByRoom.set(room.id, count);
  }

  return rooms
    .map((room) => {
      const lastMessage = room.messages[0] ?? null;
      return {
        userId: room.userId,
        userName: room.user.name ?? "이름 없음",
        userRole: room.user.role,
        lastMessage: lastMessage?.content ?? null,
        lastMessageAt: (lastMessage?.createdAt ?? room.createdAt).toISOString(),
        unreadCount: unreadByRoom.get(room.id) ?? 0,
      };
    })
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}
