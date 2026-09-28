import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getSupportChatMessages } from "@/lib/support-chat";
import { AdminChatBox } from "@/components/admin-chat-box";

export default async function AdminSupportRoomPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await requireAdmin();

  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) notFound();

  const result = await getSupportChatMessages(userId, session.user.id);
  const messages = "error" in result ? [] : result.messages;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
      <div className="border-b border-neutral-200 pb-3">
        <p className="text-xs text-neutral-400">고객센터 문의</p>
        <h1 className="text-lg font-bold">{user.name ?? "이름 없음"}</h1>
      </div>

      <AdminChatBox
        endpoint={`/api/admin/support/${userId}/messages`}
        viewerId={session.user.id}
        initialMessages={messages}
      />
    </main>
  );
}
