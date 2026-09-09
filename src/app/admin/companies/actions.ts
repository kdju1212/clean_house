"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { toActionError, type ActionState } from "@/lib/action-state";

type CompanyStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

async function transitionStatus(
  formData: FormData,
  from: CompanyStatus,
  to: CompanyStatus
): Promise<ActionState> {
  try {
    await requireAdmin();

    const companyId = formData.get("companyId");
    if (typeof companyId !== "string" || companyId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }

    // Scoping the update to the expected current status keeps this a valid
    // state transition even if two admins act on the same company at once —
    // an unmatched id or an unexpected current status both just match zero
    // rows here, so this never touches the DB in either case.
    const result = await prisma.company.updateMany({
      where: { id: companyId, status: from },
      data: { status: to },
    });
    if (result.count === 0) {
      throw new Error("이미 상태가 변경되었거나 존재하지 않는 업체예요.");
    }

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

export async function approveCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return transitionStatus(formData, "PENDING", "ACTIVE");
}

export async function suspendCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return transitionStatus(formData, "ACTIVE", "SUSPENDED");
}

export async function reactivateCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return transitionStatus(formData, "SUSPENDED", "ACTIVE");
}
