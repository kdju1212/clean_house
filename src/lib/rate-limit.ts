import "server-only";
import { prisma } from "@/lib/prisma";

type Limit = { limit: number; windowMs: number };

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Rows are only ever counted within a window, so anything older than the
// longest allowed window is dead weight — no limit may use a longer one.
const RETENTION_MS = DAY_MS;
const PRUNE_PROBABILITY = 0.01;

/**
 * The two "내 위치로 찾기" endpoints each call Kakao's Local API, whose daily
 * quota is shared by every user of the service — so both count against
 * one per-IP budget. Anyone can call them without logging in (region
 * selection happens before login), which is why this keys on IP.
 */
export const KAKAO_GEO_LIMITS: Limit[] = [
  { limit: 20, windowMs: MINUTE_MS },
  { limit: 200, windowMs: DAY_MS },
];

/** The caller's IP. On Vercel, x-forwarded-for is set by the platform
 * itself (a client-sent value is overwritten), so its first entry is the
 * real client address. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Counts one request against `key` and returns whether it's allowed — false
 * once any of `limits` is already used up within its window (a blocked
 * request isn't counted, so waiting out the window always recovers).
 * Concurrent requests can overshoot a limit by a request or two, which is
 * fine for abuse protection.
 */
export async function consumeRateLimit(key: string, limits: Limit[]): Promise<boolean> {
  const now = Date.now();

  for (const { limit, windowMs } of limits) {
    if (windowMs > RETENTION_MS) {
      throw new Error("rate limit window exceeds retention");
    }
    const count = await prisma.rateLimitHit.count({
      where: { key, createdAt: { gte: new Date(now - windowMs) } },
    });
    if (count >= limit) return false;
  }

  await prisma.rateLimitHit.create({ data: { key } });

  if (Math.random() < PRUNE_PROBABILITY) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_MS) } } });
  }
  return true;
}
