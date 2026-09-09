"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

type CompanyStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

async function transitionStatus(
  formData: FormData,
  from: CompanyStatus,
  to: CompanyStatus
) {
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
}

export async function approveCompany(formData: FormData) {
  await transitionStatus(formData, "PENDING", "ACTIVE");
}

export async function suspendCompany(formData: FormData) {
  await transitionStatus(formData, "ACTIVE", "SUSPENDED");
}

export async function reactivateCompany(formData: FormData) {
  await transitionStatus(formData, "SUSPENDED", "ACTIVE");
}
