import Link from "next/link";
import { auth } from "@/lib/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-semibold"
        >
          <span aria-hidden>📍</span>
          <span>화성시</span>
          <span aria-hidden className="text-neutral-400">
            ▾
          </span>
        </button>

        <div className="flex items-center gap-3">
          <Link
            href={session?.user ? "/company" : "/login"}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            사장님이신가요?
          </Link>
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
