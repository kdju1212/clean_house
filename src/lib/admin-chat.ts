import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyNewChatMessage } from "@/lib/notification";

const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 20;

export type AdminChatServiceResult<T> = T | { error: string; status: number };

type AdminChatAccess = {
  companyId: string;
  ownerUserId: string;
  isAdmin: boolean;
};

/**
 * A 관리자 문의 room is visible to any admin (there's no per-admin
 * assignment — whoever answers, answers) and to the owner of that one
 * company. Returns null (never throws) so callers can turn it into a clean
 * 403/404, same shape as requireChatAccess in chat.ts.
 */
async function requireAdminChatAccess(
  companyId: string,
  userId: string
): Promise<AdminChatAccess | null> {
  const [user, company] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { ownerUserId: true } }),
  ]);
  if (!company) return null;

  const isAdmin = user?.role === "ADMIN";
  const isOwner = company.ownerUserId === userId;
  if (!isAdmin && !isOwner) return null;

  return { companyId, ownerUserId: company.ownerUserId, isAdmin };
}

/** Finds this company's room, creating it on first use — there's exactly
 * one per company, so no "which room" question ever comes up like it would
 * for reservation-scoped ChatRoom. */
async function findOrCreateRoom(companyId: string): Promise<{ id: string }> {
  const existing = await prisma.adminChatRoom.findUnique({ where: { companyId } });
  if (existing) return existing;
  return prisma.adminChatRoom.create({ data: { companyId } });
}

export async function getAdminChatMessages(
  companyId: string,
  userId: string
): Promise<
  AdminChatServiceResult<{
    messages: { id: string; senderId: string; content: string; createdAt: string }[];
  }>
> {
  const access = await requireAdminChatAccess(companyId, userId);
  if (!access) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  const room = await findOrCreateRoom(companyId);
  const messages = await prisma.adminChatMessage.findMany({
    where: { chatRoomId: room.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Viewing the thread marks the other side's messages as read — same
  // "not sent by me" rule as chat-service.ts, valid here too since a room
  // only ever has two kinds of senders: this company's owner, and admins.
  await prisma.adminChatMessage.updateMany({
    where: { chatRoomId: room.id, senderId: { not: userId }, isRead: false },
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

export async function sendAdminChatMessage(
  companyId: string,
  userId: string,
  rawContent: unknown
): Promise<
  AdminChatServiceResult<{
    message: { id: string; senderId: string; content: string; createdAt: string };
  }>
> {
  const access = await requireAdminChatAccess(companyId, userId);
  if (!access) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  const recentCount = await prisma.adminChatMessage.count({
    where: { senderId: userId, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
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

  const room = await findOrCreateRoom(companyId);
  const message = await prisma.adminChatMessage.create({
    data: { chatRoomId: room.id, senderId: userId, content },
  });

  const link = `/company/chat`;
  if (access.isAdmin) {
    // Sent by an admin -> only the company owner needs telling.
    await notifyNewChatMessage({ userId: access.ownerUserId, link, preview: content.slice(0, 80) });
  } else {
    // Sent by the company owner -> every admin needs telling, since
    // there's no per-admin assignment (see requireAdminChatAccess above).
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        notifyNewChatMessage({
          userId: admin.id,
          link: `/admin/companies/${companyId}/chat`,
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
