"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/notification";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function resolveReport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Set only when this call actually flips a company to SUSPENDED — the
  // notification fires after the transaction commits (createNotification
  // isn't transactional itself, same as suspendCompany in admin/companies).
  let suspension: { ownerUserId: string; reason: string } | null;

  try {
    await requireAdmin();

    const reportId = formData.get("reportId");
    const action = formData.get("action");
    if (typeof reportId !== "string" || reportId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }
    if (action !== "hide" && action !== "dismiss" && action !== "suspend") {
      throw new Error("잘못된 처리 방식이에요.");
    }

    suspension = await prisma.$transaction(async (tx) => {
      let result: { ownerUserId: string; reason: string } | null = null;

      // Atomically claim the report by flipping PENDING -> RESOLVED in the
      // same statement that checks its current status. If two admins submit
      // at once, only one update matches a row (count > 0); the other gets
      // count === 0 and bails out here without touching anything else — no
      // TOCTOU window between a separate "read status" step and the write.
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
          // Throwing here rolls back the claim above too, so the report
          // stays PENDING rather than being silently marked RESOLVED.
          throw new Error("지원하지 않는 처리 방식이에요.");
        }
        const review = await tx.review.findUnique({ where: { id: report.targetId } });
        if (!review) {
          throw new Error("신고 대상 리뷰를 찾을 수 없어요.");
        }
        await tx.review.update({
          where: { id: review.id },
          data: { hidden: true },
        });
        // Hiding the review resolves every other pending report against it
        // too, not just the one the admin clicked — otherwise duplicate
        // reports on the same already-hidden review linger forever.
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
        // Same reasoning as the hide branch — every other pending report
        // against this company is resolved too, not just the clicked one.
        await tx.report.updateMany({
          where: { targetType: "COMPANY", targetId: company.id, status: "PENDING" },
          data: { status: "RESOLVED" },
        });
      }

      return result;
    });

    if (suspension) {
      await createNotification({
        userId: suspension.ownerUserId,
        type: "COMPANY_SUSPENDED",
        title: "업체가 정지되었어요",
        body: suspension.reason,
        link: "/company",
      });
    }

    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    revalidatePath("/admin/companies");
  } catch (err) {
    return toActionError(err);
  }
}
