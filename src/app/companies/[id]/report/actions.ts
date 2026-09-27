"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";
import { notifyAdminsOfReport } from "@/lib/notification";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function reportCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let redirectTo: string;

  try {
    const session = await requireSession();

    const companyId = formData.get("companyId");
    const reason = formData.get("reason");

    if (typeof companyId !== "string" || companyId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error("신고 사유를 입력해주세요.");
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new Error("존재하지 않는 업체예요.");
    }

    const trimmedReason = reason.trim().slice(0, 500);
    await prisma.report.create({
      data: {
        reporterId: session.user.id,
        targetType: "COMPANY",
        targetId: company.id,
        reason: trimmedReason,
      },
    });
    await notifyAdminsOfReport({ targetType: "COMPANY", reason: trimmedReason });

    redirectTo = `/companies/${company.id}/report?done=1`;
  } catch (err) {
    return toActionError(err);
  }

  redirect(redirectTo);
}
