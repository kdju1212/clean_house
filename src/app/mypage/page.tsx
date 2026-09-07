import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePhone } from "./actions";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">마이페이지</h1>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-500">이름</p>
        <p className="font-medium">{user.name ?? "-"}</p>
        <p className="mt-3 text-sm text-neutral-500">이메일</p>
        <p className="font-medium">{user.email ?? "-"}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold">연락처</p>
        <p className="mt-1 text-xs text-neutral-500">
          예약 시 업체에 전달되는 연락처예요. 소셜 로그인만으로는 확인되지
          않아 직접 등록해주세요.
        </p>
        <form action={updatePhone} className="mt-3 flex gap-2">
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            placeholder="010-0000-0000"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            저장
          </button>
        </form>
      </section>

      <Link
        href="/reservations"
        className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold"
      >
        내 예약
        <span aria-hidden className="text-neutral-400">
          →
        </span>
      </Link>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-6"
      >
        <button type="submit" className="text-sm text-neutral-500 underline">
          로그아웃
        </button>
      </form>
    </main>
  );
}
