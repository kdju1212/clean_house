import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getRevenueStatsForAdmin } from "@/lib/admin-stats-service";
import { RevenueTrendChart } from "./revenue-trend-chart";

const PERIOD_OPTIONS = [6, 12] as const;

function formatWon(n: number): string {
  return `${n.toLocaleString()}원`;
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  await requireAdmin();

  const { months: rawMonths } = await searchParams;
  const months = PERIOD_OPTIONS.includes(Number(rawMonths) as (typeof PERIOD_OPTIONS)[number])
    ? (Number(rawMonths) as (typeof PERIOD_OPTIONS)[number])
    : 6;

  const stats = await getRevenueStatsForAdmin(months);

  const cards = [
    { label: "오늘 거래액", value: formatWon(stats.today.revenue), sub: `완료 ${stats.today.count}건` },
    { label: "이번 달 거래액", value: formatWon(stats.thisMonth.revenue), sub: `완료 ${stats.thisMonth.count}건` },
    { label: "누적 거래액", value: formatWon(stats.allTime.revenue), sub: `완료 ${stats.allTime.count}건` },
    { label: "이번 달 신규 고객", value: `${stats.newCustomersThisMonth}명`, sub: null },
    { label: "이번 달 신규 업체", value: `${stats.newCompaniesThisMonth}개`, sub: null },
    { label: "활성 업체", value: `${stats.activeCompanies}개`, sub: null },
  ];

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">매출 통계</h1>
      <p className="mt-1 text-sm text-neutral-500">
        완료된 예약 기준 거래액이에요. 직접 결제는 처리하지 않아서, 업체가 실제로
        받은 금액과 다를 수 있어요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-xl font-bold text-neutral-900">{card.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{card.label}</p>
            {card.sub && <p className="mt-0.5 text-[11px] text-neutral-400">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">월별 거래액</h2>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Link
                key={opt}
                href={`/admin/stats?months=${opt}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  months === opt
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-500"
                }`}
              >
                {opt}개월
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <RevenueTrendChart data={stats.monthly} />
        </div>
      </div>
    </div>
  );
}
