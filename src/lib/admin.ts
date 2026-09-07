import "server-only";
import { auth } from "@/lib/auth";

/** Throws unless the caller is signed in as ADMIN. For use inside Server Actions. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}
