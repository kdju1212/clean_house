"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function resolveReport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const reportId = formData.get("reportId");
    const action = formData.get("action");
    if (typeof reportId !== "string" || reportId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }
    if (action !== "hide" && action !== "dismiss") {
      throw new Error("잘못된 처리 방식이에요.");
    }

    await prisma.$transaction(async (tx) => {
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
      if (report.targetType !== "REVIEW") {
        // Throwing here rolls back the claim above too, so the report stays
        // PENDING rather than being silently marked RESOLVED with no effect.
        throw new Error("지원하지 않는 신고 대상이에요.");
      }

      if (action === "hide") {
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
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin");
  } catch (err) {
    return toActionError(err);
  }
}
