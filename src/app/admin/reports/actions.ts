"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { resolveReportForAdmin } from "@/lib/admin-report-service";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function resolveReport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const reportId = formData.get("reportId");
    if (typeof reportId !== "string" || reportId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }

    const result = await resolveReportForAdmin(reportId, formData.get("action"));
    if (result.error) throw new Error(result.error);

    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    revalidatePath("/admin/companies");
  } catch (err) {
    return toActionError(err);
  }
}
