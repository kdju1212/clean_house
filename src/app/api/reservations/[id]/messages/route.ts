import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireChatAccess } from "@/lib/chat";

const MAX_MESSAGE_LENGTH = 1000;

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

  return NextResponse.json({
    message: {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  });
}
