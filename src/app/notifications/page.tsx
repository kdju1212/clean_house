import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_TYPE_ICON } from "@/lib/notification";
import { SubmitButton } from "@/components/submit-button";
import { markAllNotificationsRead, openNotification } from "./actions";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">알림</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <SubmitButton className="text-xs text-neutral-500 underline" pendingText="처리 중...">
              모두 읽음 처리
            </SubmitButton>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          아직 알림이 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <form action={openNotification}>
                <input type="hidden" name="notificationId" value={n.id} />
                <SubmitButton
                  className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                    n.isRead
                      ? "border-neutral-200 bg-white"
                      : "border-neutral-900 bg-neutral-50"
                  }`}
                >
                  <span className="text-xl" aria-hidden>
                    {NOTIFICATION_TYPE_ICON[n.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{n.title}</span>
                      {!n.isRead && (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        />
                      )}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-neutral-400">
                      {n.createdAt.toLocaleString("ko-KR")}
                    </span>
                  </span>
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
