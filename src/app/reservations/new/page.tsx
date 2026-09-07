import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIME_SLOTS } from "@/lib/reservation";
import { createReservation } from "../actions";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { companyId } = await searchParams;
  if (!companyId) notFound();

  const [company, me] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: { services: { include: { category: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
  ]);

  if (!company || company.status !== "ACTIVE") notFound();

  if (!company.isAvailable || company.services.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="text-3xl">😥</p>
        <h1 className="text-lg font-bold">지금은 예약을 받지 않는 업체예요</h1>
        <Link
          href={`/companies/${company.id}`}
          className="mt-4 text-sm font-medium underline"
        >
          업체 페이지로 돌아가기
        </Link>
      </main>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-neutral-400">{company.name}</p>
      <h1 className="mt-1 text-lg font-bold">예약 신청</h1>
      <p className="mt-1 text-sm text-neutral-500">
        전화 없이 바로 예약을 신청할 수 있어요. 업체가 확인 후 승인하면
        예약이 확정돼요.
      </p>

      <form action={createReservation} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="companyId" value={company.id} />

        <label className="flex flex-col gap-1 text-sm font-medium">
          청소 종류
          <select
            name="categoryId"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          >
            {company.services.map((s) => (
              <option key={s.categoryId} value={s.categoryId}>
                {s.category.name} ({s.price.toLocaleString()}원~)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          서비스 주소
          <input
            name="address"
            required
            placeholder="도로명 주소"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          상세 주소 (선택)
          <input
            name="addressDetail"
            placeholder="동/호수 등"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            희망 날짜
            <input
              name="desiredDate"
              type="date"
              min={todayStr}
              defaultValue={todayStr}
              required
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            희망 시간
            <select
              name="desiredTime"
              required
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          이름
          <input
            name="name"
            defaultValue={me.name ?? ""}
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          연락처
          <input
            name="phone"
            type="tel"
            defaultValue={me.phone ?? ""}
            required
            placeholder="010-0000-0000"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          예약 신청하기
        </button>
      </form>
    </main>
  );
}
