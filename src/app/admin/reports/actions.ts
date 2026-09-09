"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function resolveReport(formData: FormData) {
  await requireAdmin();

  const reportId = formData.get("reportId");
  const action = formData.get("action");
  if (typeof reportId !== "string" || (action !== "hide" && action !== "dismiss")) {
    return;
  }

  // Scoped to PENDING so a report already handled by another admin can't
  // be re-processed (e.g. re-hiding an already-resolved review).
  const report = await prisma.report.findFirst({
    where: { id: reportId, status: "PENDING" },
  });
  if (!report || report.targetType !== "REVIEW") return;

  if (action === "hide") {
    await prisma.review.update({
      where: { id: report.targetId },
      data: { hidden: true },
    });
    // Hiding the review resolves every pending report against it, not just
    // the one the admin clicked — otherwise duplicate reports linger forever.
    await prisma.report.updateMany({
      where: { targetType: "REVIEW", targetId: report.targetId, status: "PENDING" },
      data: { status: "RESOLVED" },
    });
  } else {
    await prisma.report.update({
      where: { id: report.id },
      data: { status: "RESOLVED" },
    });
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
