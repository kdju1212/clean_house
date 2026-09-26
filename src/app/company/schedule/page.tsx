import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { removeBlockedDate } from "./actions";
import { AddBlockedDateForm } from "./add-blocked-date-form";
import { ClosedWeekdaysSection } from "./closed-weekdays-picker";
import {
  CrewCountPicker,
  CustomTimeSlotsPicker,
  ReservationIntervalPicker,
  SameDayCutoffPicker,
} from "./reservation-interval-picker";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default async function CompanySchedulePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
  });

  if (!company) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-lg font-bold">휴무일 관리</h1>
        <p className="mt-2 text-sm text-neutral-500">아직 등록된 업체가 없어요.</p>
        <Link
          href="/company/register"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          업체 등록하기
        </Link>
      </main>
    );
  }

  const blockedDates = await prisma.companyBlockedDate.findMany({
    where: { companyId: company.id, date: { gte: startOfToday() } },
    orderBy: { date: "asc" },
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">휴무일 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">
        예약을 받지 않을 날짜를 미리 등록해두면, 고객이 그 날짜로는 예약을
        신청할 수 없어요.
      </p>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">예약 텀</h2>
        <div className="mt-3">
          <CrewCountPicker initial={company.crewCount} />
        </div>
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <ReservationIntervalPicker initial={company.reservationIntervalHours} />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">특정 시간만 예약 받기</h2>
        <div className="mt-3">
          <CustomTimeSlotsPicker initial={company.customTimeSlots} />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">당일 예약 마감시간</h2>
        <div className="mt-3">
          <SameDayCutoffPicker initial={company.sameDayCutoffTime} />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">정기 휴무</h2>
        <div className="mt-3">
          <ClosedWeekdaysSection initial={company.closedWeekdays} />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">휴무일 추가</h2>
        <AddBlockedDateForm todayStr={todayStr} />
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">등록된 휴무일</h2>
        {blockedDates.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">등록된 휴무일이 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {blockedDates.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm"
              >
                <span>
                  {b.date.toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </span>
                <form action={removeBlockedDate}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className="text-xs text-neutral-400 underline" pendingText="삭제 중...">
                    삭제
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
