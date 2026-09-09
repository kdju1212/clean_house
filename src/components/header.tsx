import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSelectedRegion } from "@/lib/region";
import { getUnreadNotificationCount } from "@/lib/notification";

export async function Header() {
  const [session, region] = await Promise.all([auth(), getSelectedRegion()]);
  const unreadCount = session?.user
    ? await getUnreadNotificationCount(session.user.id)
    : 0;

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="홈으로"
            className="text-lg leading-none"
          >
            <span aria-hidden>🏠</span>
          </Link>
          <Link
            href="/regions"
            className="flex items-center gap-1 text-sm font-semibold"
          >
            <span aria-hidden>📍</span>
            <span>{region?.name ?? "지역 선택"}</span>
            <span aria-hidden className="text-neutral-400">
              ▾
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              관리자
            </Link>
          )}
          <Link
            href={session?.user ? "/company" : "/login"}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            사장님이신가요?
          </Link>
          {session?.user && (
            <Link href="/notifications" aria-label="알림" className="relative text-lg leading-none">
              <span aria-hidden>🔔</span>
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {session?.user ? (
            <Link
              href="/mypage"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              마이페이지
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
