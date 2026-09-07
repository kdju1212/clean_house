import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireChatAccess } from "@/lib/chat";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservation";
import { ChatBox } from "./chat-box";

export default async function ReservationChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const access = await requireChatAccess(id, session.user.id);
  if (!access) notFound();

  const { reservation, isCustomer } = access;
  const counterpartName = isCustomer
    ? reservation.company.name
    : reservation.customerName;

  const messages = await prisma.chatMessage.findMany({
    where: { chatRoomId: access.chatRoomId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
      <div className="border-b border-neutral-200 pb-3">
        <p className="text-xs text-neutral-400">
          {reservation.category.name} · {RESERVATION_STATUS_LABEL[reservation.status]}
        </p>
        <h1 className="text-lg font-bold">{counterpartName}</h1>
      </div>

      <ChatBox
        reservationId={reservation.id}
        viewerId={session.user.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
