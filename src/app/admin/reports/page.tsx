import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { COMPANY_STATUS_BADGE_CLASS, COMPANY_STATUS_LABEL } from "@/lib/company";
import { ResolveReportForm } from "./resolve-report-form";

const STATUS_FILTERS = [
  { value: "PENDING", label: "처리 대기" },
  { value: "RESOLVED", label: "처리 완료" },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const { status: rawStatus } = await searchParams;
  const activeStatus = rawStatus === "RESOLVED" ? "RESOLVED" : "PENDING";

  const [reports, pendingCount, resolvedCount] = await Promise.all([
    prisma.report.findMany({
      where: { status: activeStatus },
      include: { reporter: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "RESOLVED" } }),
  ]);

  const reviewIds = reports
    .filter((r) => r.targetType === "REVIEW")
    .map((r) => r.targetId);
  const companyIds = reports
    .filter((r) => r.targetType === "COMPANY")
    .map((r) => r.targetId);
  const [reviews, reportedCompanies] = await Promise.all([
    prisma.review.findMany({
      where: { id: { in: reviewIds } },
      include: {
        company: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true, status: true },
    }),
  ]);
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  const companyById = new Map(reportedCompanies.map((c) => [c.id, c]));
  const countByStatus: Record<string, number> = {
    PENDING: pendingCount,
    RESOLVED: resolvedCount,
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">신고 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">
        리뷰 신고와 업체 신고를 처리할 수 있어요.
      </p>

      <div className="mt-4 flex gap-1">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/reports?status=${f.value}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              activeStatus === f.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600"
            }`}
          >
            {f.label} {countByStatus[f.value]}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          {activeStatus === "PENDING"
            ? "처리 대기 중인 신고가 없어요."
            : "처리 완료된 신고가 없어요."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reports.map((report) => {
            const review =
              report.targetType === "REVIEW" ? reviewById.get(report.targetId) : undefined;
            const company =
              report.targetType === "COMPANY" ? companyById.get(report.targetId) : undefined;
            return (
              <li
                key={report.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">
                    {report.reporter.name ?? "익명"}님의 신고
                  </p>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {report.createdAt.toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">신고 사유</p>
                <p className="mt-0.5">{report.reason}</p>

                {review && (
                  <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-medium text-neutral-600">
                        {review.company.name} · {review.customer.name ?? "익명"}
                      </p>
                      <span className="shrink-0 text-xs font-semibold text-amber-500">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-700">{review.content}</p>
                    {review.hidden && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        숨김 처리된 리뷰예요.
                      </p>
                    )}
                  </div>
                )}
                {company && (
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 p-3"
                  >
                    <span className="min-w-0 truncate text-xs font-medium text-neutral-600">
                      {company.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COMPANY_STATUS_BADGE_CLASS[company.status]}`}
                    >
                      {COMPANY_STATUS_LABEL[company.status]}
                    </span>
                  </Link>
                )}
                {!review && !company && (
                  <p className="mt-3 text-xs text-neutral-400">
                    신고 대상을 찾을 수 없어요 (삭제됨).
                  </p>
                )}

                {activeStatus === "PENDING" && review && (
                  <div className="mt-3 flex gap-2">
                    <ResolveReportForm reportId={report.id} action="hide" />
                    <ResolveReportForm reportId={report.id} action="dismiss" />
                  </div>
                )}
                {activeStatus === "PENDING" && company && (
                  <div className="mt-3 flex gap-2">
                    {company.status === "ACTIVE" && (
                      <ResolveReportForm reportId={report.id} action="suspend" />
                    )}
                    <ResolveReportForm reportId={report.id} action="dismiss" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
