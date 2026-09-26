"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwnedCompany } from "@/lib/company-auth";
import { toActionError, type ActionState } from "@/lib/action-state";
import { addBlockedDateForOwner } from "@/lib/company-schedule-service";

export async function addBlockedDate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();
    await addBlockedDateForOwner(session.user.id, formData.get("date"));
    revalidatePath("/company/schedule");
    revalidatePath("/company/reservations");
  } catch (err) {
    return toActionError(err);
  }
}

export async function removeBlockedDate(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  await prisma.companyBlockedDate.deleteMany({
    where: { id, companyId: company.id },
  });

  revalidatePath("/company/schedule");
  revalidatePath("/company/reservations");
}
