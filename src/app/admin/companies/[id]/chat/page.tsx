import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getAdminChatMessages } from "@/lib/admin-chat";
import { AdminChatBox } from "@/components/admin-chat-box";

export default async function AdminCompanyChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();

  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!company) notFound();

  const result = await getAdminChatMessages(company.id, session.user.id);
  const messages = "error" in result ? [] : result.messages;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
      <div className="border-b border-neutral-200 pb-3">
        <p className="text-xs text-neutral-400">관리자 문의</p>
        <h1 className="text-lg font-bold">{company.name}</h1>
      </div>

      <AdminChatBox companyId={company.id} viewerId={session.user.id} initialMessages={messages} />
    </main>
  );
}
