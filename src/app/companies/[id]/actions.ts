"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";

export async function toggleFavorite(formData: FormData) {
  const session = await requireSession();

  const companyId = formData.get("companyId");
  if (typeof companyId !== "string" || companyId.length === 0) return;

  const existing = await prisma.favorite.findUnique({
    where: { customerId_companyId: { customerId: session.user.id, companyId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    // Re-derive that the company actually exists rather than trusting the
    // client-supplied id blindly — a crafted id just silently no-ops here.
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return;
    await prisma.favorite.create({
      data: { customerId: session.user.id, companyId },
    });
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/mypage");
}
