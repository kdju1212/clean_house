"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  approveCompanyForAdmin,
  reactivateCompanyForAdmin,
  setCompanyVerifiedForAdmin,
  suspendCompanyForAdmin,
} from "@/lib/admin-company-service";
import { toActionError, type ActionState } from "@/lib/action-state";

function requireCompanyId(formData: FormData): string {
  const companyId = formData.get("companyId");
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("잘못된 요청이에요.");
  }
  return companyId;
}

export async function approveCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
    const companyId = requireCompanyId(formData);
    const result = await approveCompanyForAdmin(companyId);
    if (result.error) throw new Error(result.error);

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

/** 정지 needs a reason (shown to the owner and kept on the company row),
 * unlike the other plain state transitions above — see SuspendCompanyForm. */
export async function suspendCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
    const companyId = requireCompanyId(formData);
    const result = await suspendCompanyForAdmin(companyId, formData.get("reason"));
    if (result.error) throw new Error(result.error);

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

export async function reactivateCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
    const companyId = requireCompanyId(formData);
    const result = await reactivateCompanyForAdmin(companyId);
    if (result.error) throw new Error(result.error);

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

async function setVerified(formData: FormData, isVerified: boolean): Promise<ActionState> {
  try {
    await requireAdmin();
    const companyId = requireCompanyId(formData);
    await setCompanyVerifiedForAdmin(companyId, isVerified);

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}`);
  } catch (err) {
    return toActionError(err);
  }
}

export async function verifyCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return setVerified(formData, true);
}

export async function unverifyCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return setVerified(formData, false);
}
