import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { listSupportRoomsForAdmin } from "@/lib/support-chat";

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "고객",
  COMPANY: "업체",
  ADMIN: "관리자",
};

export default async function AdminSupportPage() {
  await requireAdmin();

  const rooms = await listSupportRoomsForAdmin();

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold">고객센터 문의</h1>

      {rooms.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">아직 들어온 문의가 없어요.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {rooms.map((room) => (
            <li key={room.userId}>
              <Link
                href={`/admin/support/${room.userId}`}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{room.userName}</span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                      {ROLE_LABEL[room.userRole] ?? room.userRole}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {room.lastMessage ?? "대화가 없어요."}
                  </p>
                </div>
                {room.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-[#ff6f0f] px-2 py-0.5 text-xs font-medium text-white">
                    {room.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
