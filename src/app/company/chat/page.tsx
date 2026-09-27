import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminChatMessages } from "@/lib/admin-chat";
import { AdminChatBox } from "@/components/admin-chat-box";

export default async function CompanyChatPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
    select: { id: true },
  });

  if (!company) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-lg font-bold">관리자에게 문의</h1>
        <p className="mt-2 text-sm text-neutral-500">아직 등록된 업체가 없어요.</p>
        <Link
          href="/company/register"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          업체 등록하기
        </Link>
      </main>
    );
  }

  const result = await getAdminChatMessages(company.id, session.user.id);
  const messages = "error" in result ? [] : result.messages;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-lg font-bold">관리자에게 문의</h1>
      </div>

      <AdminChatBox companyId={company.id} viewerId={session.user.id} initialMessages={messages} />
    </main>
  );
}
