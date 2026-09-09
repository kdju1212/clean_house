import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const access = await requireChatAccess(id, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
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
      senderId: { not: session.user.id },
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const access = await requireChatAccess(id, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const recentCount = await prisma.chatMessage.count({
    where: {
      senderId: session.user.id,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  if (recentCount >= RATE_LIMIT_MAX_MESSAGES) {
    return NextResponse.json(
      { error: "메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const content =
    typeof body?.content === "string" ? body.content.trim() : "";

  if (content.length === 0) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "메시지가 너무 길어요." }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatRoomId: access.chatRoomId,
      senderId: session.user.id,
      content,
    },
  });

  const recipientId = access.isCustomer
    ? access.reservation.company.ownerUserId
    : access.reservation.customerId;
  await notifyNewChatMessage({
    userId: recipientId,
    link: `/reservations/${id}/chat`,
    preview: content.slice(0, 80),
  });

  return NextResponse.json({
    message: {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  });
}
