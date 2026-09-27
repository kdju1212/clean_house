"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/notification";
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

/** 정지 needs a reason (shown to the owner and kept on the company row),
 * unlike the other plain state transitions above — see SuspendCompanyForm. */
export async function suspendCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const companyId = formData.get("companyId");
    const reason = formData.get("reason");
    if (typeof companyId !== "string" || companyId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error("정지 사유를 입력해주세요.");
    }
    const trimmedReason = reason.trim().slice(0, 500);

    const result = await prisma.company.updateMany({
      where: { id: companyId, status: "ACTIVE" },
      data: { status: "SUSPENDED", suspendedReason: trimmedReason },
    });
    if (result.count === 0) {
      throw new Error("이미 상태가 변경되었거나 존재하지 않는 업체예요.");
    }

    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    await createNotification({
      userId: company.ownerUserId,
      type: "COMPANY_SUSPENDED",
      title: "업체가 정지되었어요",
      body: trimmedReason,
      link: "/company",
    });

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

    const companyId = formData.get("companyId");
    if (typeof companyId !== "string" || companyId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }

    const result = await prisma.company.updateMany({
      where: { id: companyId, status: "SUSPENDED" },
      data: { status: "ACTIVE", suspendedReason: null },
    });
    if (result.count === 0) {
      throw new Error("이미 상태가 변경되었거나 존재하지 않는 업체예요.");
    }

    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    await createNotification({
      userId: company.ownerUserId,
      type: "COMPANY_REACTIVATED",
      title: "업체 정지가 해제됐어요",
      body: "다시 예약을 받을 수 있어요.",
      link: "/company",
    });

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

    const companyId = formData.get("companyId");
    if (typeof companyId !== "string" || companyId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { isVerified },
    });

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
