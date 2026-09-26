"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwnedCompany } from "@/lib/company-auth";
import { toActionError, type ActionState } from "@/lib/action-state";
import { addBlockedDateForOwner, setClosedWeekdaysForOwner } from "@/lib/company-schedule-service";

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

/** "정기 휴무" weekday chips — returns an error instead of throwing so the
 * picker can show it inline. */
export async function setClosedWeekdays(weekdays: number[]): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    await setClosedWeekdaysForOwner(session.user.id, weekdays);
    revalidatePath("/company/schedule");
    revalidatePath("/company/reservations");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "저장에 실패했어요." };
  }
}
