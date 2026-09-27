import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Mobile has no browser cookie jar, so it can't use Auth.js's session cookie
// like the web app does. Instead the app stores this token itself (secure
// storage) and sends it as `Authorization: Bearer <token>` on every request.
//
// A single long-lived access token (no refresh-token flow) is the simplest
// thing that works for the MVP — mobile users expect to stay logged in for a
// long time (similar to the web session cookie's 1-year-ish lifetime via
// REGION_COOKIE-style persistence), and a refresh flow can be added later if
// token revocation/rotation ever becomes a real requirement.
const MOBILE_TOKEN_TTL = "30d";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET이 설정되지 않았습니다.");
  }
  return new TextEncoder().encode(secret);
}

export async function issueMobileToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(MOBILE_TOKEN_TTL)
    .sign(getSecretKey());
}

/**
 * Verifies the request's Authorization: Bearer <token> header and returns the
 * caller's userId, or null if it's missing, malformed, expired, or forged.
 * Mobile API routes use this the way web pages/actions use auth() — never
 * trust any userId/companyId the client sends in the body instead of this.
 */
export async function getMobileUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length);
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Same as getMobileUserId, but also re-checks the caller's role against the
 * DB (never trusts the token's own `role` claim, which could be stale for
 * up to the token's 30-day lifetime if an account is ever demoted) and
 * returns null unless they're currently ADMIN — the mobile equivalent of
 * the web admin layout's redirect-away-if-not-ADMIN guard.
 */
export async function getMobileAdminUserId(request: Request): Promise<string | null> {
  const userId = await getMobileUserId(request);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? userId : null;
}
