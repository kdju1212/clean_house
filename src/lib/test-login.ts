import "server-only";
import { prisma } from "@/lib/prisma";

// A lightweight ID/password-free "test login" for internal QA — lets the
// developer sign in as a fixed CUSTOMER/COMPANY/ADMIN persona without a real
// Kakao/Google/Naver account. Fully disabled unless TEST_LOGIN_SECRET is set,
// and every check compares against that env var so an unset/empty secret
// always rejects. Safe to set in production only as a strong, private
// secret — anyone who has it can sign in as these test personas.
export type TestLoginRole = "CUSTOMER" | "COMPANY" | "ADMIN";

export const TEST_LOGIN_ROLES: TestLoginRole[] = ["CUSTOMER", "COMPANY", "ADMIN"];

const TEST_USERS: Record<TestLoginRole, { email: string; name: string }> = {
  CUSTOMER: { email: "test-customer@internal.test", name: "테스트 고객" },
  COMPANY: { email: "test-company@internal.test", name: "테스트 업체" },
  ADMIN: { email: "test-admin@internal.test", name: "테스트 관리자" },
};

export function isTestLoginEnabled(): boolean {
  return Boolean(process.env.TEST_LOGIN_SECRET);
}

export function verifyTestLoginSecret(secret: string | null | undefined): boolean {
  const expected = process.env.TEST_LOGIN_SECRET;
  return Boolean(expected) && secret === expected;
}

export function isTestLoginRole(role: unknown): role is TestLoginRole {
  return typeof role === "string" && (TEST_LOGIN_ROLES as string[]).includes(role);
}

/**
 * Finds or creates the fixed test user for a role. COMPANY also gets a
 * linked, already-ACTIVE Company row so company flows (services, photos,
 * reservations) are testable immediately without going through the normal
 * pending-approval registration flow.
 */
export async function upsertTestUser(role: TestLoginRole) {
  const def = TEST_USERS[role];
  const user = await prisma.user.upsert({
    where: { email: def.email },
    update: { role },
    create: { email: def.email, name: def.name, role },
  });

  if (role === "COMPANY") {
    await prisma.company.upsert({
      where: { ownerUserId: user.id },
      update: {},
      create: {
        ownerUserId: user.id,
        name: "테스트 청소 업체",
        status: "ACTIVE",
        isAvailable: true,
        introText: "테스트 계정용 업체입니다.",
      },
    });
  }

  return user;
}
