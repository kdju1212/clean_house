import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("로그인이 필요합니다.");
  }
  return session;
}

/** Always re-derives the caller's own company from the session — never
 * trust a companyId passed in from the client. */
export async function requireOwnedCompany(userId: string) {
  const company = await prisma.company.findUnique({
    where: { ownerUserId: userId },
  });
  if (!company) {
    throw new Error("등록된 업체가 없습니다.");
  }
  return company;
}
