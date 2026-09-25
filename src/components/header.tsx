import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSelectedRegion } from "@/lib/region";
import { getUnreadNotificationCount } from "@/lib/notification";
import { BellIcon, ChevronDownIcon, HomeIcon, PersonIcon, PinIcon } from "@/components/icons";

// h-14 + the 1px bottom border = 57px — category-nav-bar.tsx sticks itself
// right under this at top-[57px], so keep the two in sync.
export async function Header() {
  const [session, region] = await Promise.all([auth(), getSelectedRegion()]);
  const unreadCount = session?.user
    ? await getUnreadNotificationCount(session.user.id)
    : 0;

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <Link href="/regions" className="flex min-w-0 items-center gap-1">
          <PinIcon className="h-[22px] w-[22px] shrink-0" />
          <span className="truncate text-xl font-bold">
            {region?.name.split(" ").pop() ?? "지역 선택"}
          </span>
          <ChevronDownIcon className="h-[18px] w-[18px] shrink-0" />
        </Link>

        <div className="flex shrink-0 items-center gap-4">
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="text-xs text-neutral-400 hover:text-neutral-600">
              관리자
            </Link>
          )}
          <Link
            href={session?.user ? "/company" : "/login?callbackUrl=/company"}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            사장님이신가요?
          </Link>
          <Link href="/" aria-label="홈으로">
            <HomeIcon className="h-6 w-6" />
          </Link>
          {session?.user && (
            <Link href="/notifications" aria-label="알림" className="relative">
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-2 w-2 rounded-full border-[1.5px] border-white bg-[#ff6f0f]"
                />
              )}
            </Link>
          )}
          <Link href={session?.user ? "/mypage" : "/login"} aria-label={session?.user ? "마이페이지" : "로그인"}>
            <PersonIcon className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
