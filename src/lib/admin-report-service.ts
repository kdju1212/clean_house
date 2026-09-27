import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notification";

/** See admin-company-service.ts's header comment — same reasoning: pulled
 * out of the web Server Action so the mobile admin API route can call the
 * identical resolve logic instead of a drifting copy. */
export type AdminReportAction = "hide" | "dismiss" | "suspend";

export async function resolveReportForAdmin(
  reportId: string,
  action: unknown
): Promise<{ error?: string }> {
  if (action !== "hide" && action !== "dismiss" && action !== "suspend") {
    return { error: "잘못된 처리 방식이에요." };
  }

  let suspension: { ownerUserId: string; reason: string } | null;
  try {
    suspension = await prisma.$transaction(async (tx) => {
      let result: { ownerUserId: string; reason: string } | null = null;

      // Atomically claim the report by flipping PENDING -> RESOLVED in the
      // same statement that checks its current status — see the original
      // comment this was extracted from for the concurrency reasoning.
      const claimed = await tx.report.updateMany({
        where: { id: reportId, status: "PENDING" },
        data: { status: "RESOLVED" },
      });
      if (claimed.count === 0) {
        throw new Error("이미 처리되었거나 존재하지 않는 신고예요.");
      }

      const report = await tx.report.findUniqueOrThrow({ where: { id: reportId } });

      if (action === "hide") {
        if (report.targetType !== "REVIEW") {
          throw new Error("지원하지 않는 처리 방식이에요.");
        }
        const review = await tx.review.findUnique({ where: { id: report.targetId } });
        if (!review) {
          throw new Error("신고 대상 리뷰를 찾을 수 없어요.");
        }
        await tx.review.update({ where: { id: review.id }, data: { hidden: true } });
        await tx.report.updateMany({
          where: { targetType: "REVIEW", targetId: review.id, status: "PENDING" },
          data: { status: "RESOLVED" },
        });
      }

      if (action === "suspend") {
        if (report.targetType !== "COMPANY") {
          throw new Error("지원하지 않는 처리 방식이에요.");
        }
        const company = await tx.company.findUnique({ where: { id: report.targetId } });
        if (!company) {
          throw new Error("신고 대상 업체를 찾을 수 없어요.");
        }
        if (company.status === "ACTIVE") {
          const reason = `고객 신고에 따른 조치: ${report.reason}`.slice(0, 500);
          await tx.company.update({
            where: { id: company.id },
            data: { status: "SUSPENDED", suspendedReason: reason },
          });
          result = { ownerUserId: company.ownerUserId, reason };
        }
        await tx.report.updateMany({
          where: { targetType: "COMPANY", targetId: company.id, status: "PENDING" },
          data: { status: "RESOLVED" },
        });
      }

      return result;
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "처리에 실패했어요." };
  }

  if (suspension) {
    await createNotification({
      userId: suspension.ownerUserId,
      type: "COMPANY_SUSPENDED",
      title: "업체가 정지되었어요",
      body: suspension.reason,
      link: "/company",
    });
  }

  return {};
}

const STATUS_VALUES = ["PENDING", "RESOLVED"] as const;
export type AdminReportStatusFilter = (typeof STATUS_VALUES)[number];

export function parseReportStatusFilter(value: unknown): AdminReportStatusFilter {
  return STATUS_VALUES.includes(value as AdminReportStatusFilter)
    ? (value as AdminReportStatusFilter)
    : "PENDING";
}

/** Flattened list shape for the mobile admin reports screen — one target
 * preview field (reviewPreview or companyPreview), whichever applies. */
export async function listReportsForAdminMobile(status: AdminReportStatusFilter) {
  const reports = await prisma.report.findMany({
    where: { status },
    include: { reporter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const reviewIds = reports.filter((r) => r.targetType === "REVIEW").map((r) => r.targetId);
  const companyIds = reports.filter((r) => r.targetType === "COMPANY").map((r) => r.targetId);
  const [reviews, companies] = await Promise.all([
    prisma.review.findMany({
      where: { id: { in: reviewIds } },
      include: { company: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true, status: true },
    }),
  ]);
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  const companyById = new Map(companies.map((c) => [c.id, c]));

  return reports.map((report) => {
    const review = report.targetType === "REVIEW" ? reviewById.get(report.targetId) : undefined;
    const company = report.targetType === "COMPANY" ? companyById.get(report.targetId) : undefined;
    return {
      id: report.id,
      targetType: report.targetType,
      reporterName: report.reporter.name,
      reason: report.reason,
      createdAt: report.createdAt.toISOString(),
      reviewPreview: review
        ? {
            companyName: review.company.name,
            customerName: review.customer.name,
            rating: review.rating,
            content: review.content,
            hidden: review.hidden,
          }
        : null,
      companyPreview: company ? { id: company.id, name: company.name, status: company.status } : null,
    };
  });
}
