import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupportChatMessages } from "@/lib/support-chat";
import { AdminChatBox } from "@/components/admin-chat-box";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const result = await getSupportChatMessages(session.user.id, session.user.id);
  const messages = "error" in result ? [] : result.messages;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-lg font-bold">고객센터</h1>
        <p className="mt-1 text-xs text-neutral-500">
          궁금한 점이나 불편한 점을 남겨주시면 확인 후 답변드릴게요.
        </p>
      </div>

      <AdminChatBox
        endpoint="/api/support-chat/messages"
        viewerId={session.user.id}
        initialMessages={messages}
      />
    </main>
  );
}
