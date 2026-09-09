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
  if (typeof companyId !== "string") return;

  // Scoping the update to the expected current status keeps this a valid
  // state transition even if two admins act on the same company at once.
  await prisma.company.updateMany({
    where: { id: companyId, status: from },
    data: { status: to },
  });

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
