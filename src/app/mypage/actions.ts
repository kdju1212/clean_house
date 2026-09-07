"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updatePhone(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("로그인이 필요합니다.");
  }

  const phone = formData.get("phone");
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new Error("연락처를 입력해주세요.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone: phone.trim() },
  });

  revalidatePath("/mypage");
}
