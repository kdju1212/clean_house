import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { updatePhone } from "./actions";
import { toggleFavorite } from "../companies/[id]/actions";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  kakao: "카카오",
  naver: "네이버",
};

const RESERVATION_SUMMARY = [
  { status: "REQUESTED", label: "예약 예정" },
  { status: "ACCEPTED", label: "진행 중" },
  { status: "COMPLETED", label: "완료" },
] as const;

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [user, statusCounts, myReviews, favorites] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: { accounts: true },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      where: { customerId: session.user.id },
      _count: true,
    }),
    prisma.review.findMany({
      where: { customerId: session.user.id },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.favorite.findMany({
      where: { customerId: session.user.id },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalReservations = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const loginProvider = user.accounts[0]?.provider;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">마이페이지</h1>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-500">이름</p>
        <p className="font-medium">{user.name ?? "-"}</p>
        <p className="mt-3 text-sm text-neutral-500">이메일</p>
        <p className="font-medium">{user.email ?? "-"}</p>
        <p className="mt-3 text-sm text-neutral-500">로그인 계정</p>
        <p className="font-medium">
          {loginProvider ? PROVIDER_LABEL[loginProvider] ?? loginProvider : "-"}
        </p>
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
          <SubmitButton
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            pendingText="저장 중..."
          >
            저장
          </SubmitButton>
        </form>
      </section>

      <Link
        href="/reservations"
        className="mt-4 block rounded-2xl border border-neutral-200 bg-white p-4"
      >
        <div className="flex items-center justify-between text-sm font-semibold">
          내 예약 {totalReservations > 0 && `(${totalReservations})`}
          <span aria-hidden className="text-neutral-400">
            →
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {RESERVATION_SUMMARY.map((s) => (
            <div key={s.status} className="rounded-lg bg-neutral-50 py-2">
              <p className="font-semibold text-neutral-900">
                {countByStatus.get(s.status) ?? 0}
              </p>
              <p className="mt-0.5 text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </Link>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">
          내가 작성한 리뷰 {myReviews.length > 0 && `(${myReviews.length})`}
        </h2>
        {myReviews.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            아직 작성한 리뷰가 없어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {myReviews.map((review) => (
              <li key={review.id}>
                <Link
                  href={`/companies/${review.companyId}`}
                  className="block rounded-lg border border-neutral-100 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{review.company.name}</p>
                    <span className="shrink-0 text-xs font-semibold text-amber-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {review.content}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">
          관심 업체 {favorites.length > 0 && `(${favorites.length})`}
        </h2>
        {favorites.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            찜한 업체가 없어요. 업체 상세페이지에서 ♡를 눌러 담아보세요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-sm"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {favorite.company.mainImageUrl ? (
                    <Image
                      src={favorite.company.mainImageUrl}
                      alt={favorite.company.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg">
                      🧽
                    </div>
                  )}
                </div>
                <Link
                  href={`/companies/${favorite.company.id}`}
                  className="flex-1 truncate font-medium"
                >
                  {favorite.company.name}
                </Link>
                <form action={toggleFavorite}>
                  <input type="hidden" name="companyId" value={favorite.companyId} />
                  <SubmitButton
                    aria-label="찜 해제"
                    className="shrink-0 text-lg leading-none text-red-500"
                    pendingText="…"
                  >
                    ♥
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-6"
      >
        <SubmitButton className="text-sm text-neutral-500 underline" pendingText="로그아웃 중...">
          로그아웃
        </SubmitButton>
      </form>
    </main>
  );
}
