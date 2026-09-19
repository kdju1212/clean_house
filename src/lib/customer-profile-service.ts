import "server-only";
import { prisma } from "@/lib/prisma";

/** Shared by the web mypage Server Action and the mobile /api/mobile/mypage/phone
 * route so the same validation applies regardless of which client calls it. */
export async function updateCustomerPhone(userId: string, phoneRaw: unknown): Promise<void> {
  if (typeof phoneRaw !== "string" || phoneRaw.trim().length === 0) {
    throw new Error("연락처를 입력해주세요.");
  }

  const phone = phoneRaw.trim();
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 9 || digits.length > 11) {
    throw new Error("올바른 연락처 형식이 아닙니다.");
  }

  await prisma.user.update({ where: { id: userId }, data: { phone } });
}
