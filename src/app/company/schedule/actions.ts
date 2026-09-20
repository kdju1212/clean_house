"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwnedCompany } from "@/lib/company-auth";
import { toActionError, type ActionState } from "@/lib/action-state";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function addBlockedDate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const company = await requireOwnedCompany(session.user.id);

    const dateRaw = formData.get("date");
    if (typeof dateRaw !== "string") {
      throw new Error("휴무일을 선택해주세요.");
    }
    const date = new Date(`${dateRaw}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date < startOfToday()) {
      throw new Error("오늘 이후 날짜를 선택해주세요.");
    }

    try {
      await prisma.companyBlockedDate.create({
        data: { companyId: company.id, date },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        throw new Error("이미 휴무일로 등록된 날짜예요.");
      }
      throw err;
    }

    revalidatePath("/company/schedule");
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
}
