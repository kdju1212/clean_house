import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COMPANY_STATUS_BADGE_CLASS, COMPANY_STATUS_LABEL } from "@/lib/company";
import { requireAdmin } from "@/lib/admin";
import { CompanyStatusForm } from "./company-status-form";

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "승인 대기" },
  { value: "ACTIVE", label: "활성" },
  { value: "SUSPENDED", label: "정지" },
] as const;

type StatusFilterValue = (typeof STATUS_FILTERS)[number]["value"];

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const { status: rawStatus } = await searchParams;
  const activeStatus: StatusFilterValue = STATUS_FILTERS.some(
    (f) => f.value === rawStatus
  )
    ? (rawStatus as StatusFilterValue)
    : "";

  const [companies, statusCounts] = await Promise.all([
    prisma.company.findMany({
      where: activeStatus ? { status: activeStatus } : {},
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true, email: true } },
        services: { include: { category: true } },
        regions: { include: { region: true } },
      },
    }),
    prisma.company.groupBy({ by: ["status"], _count: true }),
  ]);
  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">업체 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">총 {totalCount}개 업체</p>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const count = f.value ? (countByStatus.get(f.value) ?? 0) : totalCount;
          return (
            <Link
              key={f.value}
              href={f.value ? `/admin/companies?status=${f.value}` : "/admin/companies"}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeStatus === f.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              {f.label} {count}
            </Link>
          );
        })}
      </div>

      {companies.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          해당하는 업체가 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {companies.map((company) => (
            <li
              key={company.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <Link href={`/admin/companies/${company.id}`} className="block">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{company.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COMPANY_STATUS_BADGE_CLASS[company.status]}`}
                  >
                    {COMPANY_STATUS_LABEL[company.status]}
                  </span>
                </div>

                <dl className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
                  <div>
                    등록일 {company.createdAt.toLocaleDateString("ko-KR")}
                  </div>
                  <div>
                    소유자 {company.owner.name ?? "-"} (
                    {company.owner.email ?? "이메일 없음"})
                  </div>
                  <div>
                    서비스{" "}
                    {company.services.map((s) => s.category.name).join(", ") ||
                      "-"}
                  </div>
                  <div>
                    지역{" "}
                    {company.regions.map((r) => r.region.name).join(", ") ||
                      "-"}
                  </div>
                </dl>
              </Link>

              <div className="mt-3 flex gap-2">
                {company.status === "PENDING" && (
                  <CompanyStatusForm companyId={company.id} action="approve" />
                )}
                {company.status === "ACTIVE" && (
                  <CompanyStatusForm companyId={company.id} action="suspend" />
                )}
                {company.status === "SUSPENDED" && (
                  <CompanyStatusForm companyId={company.id} action="reactivate" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
