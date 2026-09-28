import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { resetDb } from "@/test/db";

const MINUTE = 60 * 1000;

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "5.6.7.8" } }))).toBe("5.6.7.8");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("consumeRateLimit", () => {
  beforeEach(resetDb);

  it("allows up to the limit, then blocks", async () => {
    const limits = [{ limit: 3, windowMs: MINUTE }];
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await consumeRateLimit("k", limits));
    expect(results).toEqual([true, true, true, false, false]);
    // Blocked attempts aren't recorded.
    expect(await prisma.rateLimitHit.count({ where: { key: "k" } })).toBe(3);
  });

  it("keeps separate budgets per key", async () => {
    const limits = [{ limit: 1, windowMs: MINUTE }];
    expect(await consumeRateLimit("ip-a", limits)).toBe(true);
    expect(await consumeRateLimit("ip-a", limits)).toBe(false);
    expect(await consumeRateLimit("ip-b", limits)).toBe(true);
  });

  it("recovers once old requests fall out of the window", async () => {
    await prisma.rateLimitHit.createMany({
      data: [1, 2].map(() => ({ key: "k", createdAt: new Date(Date.now() - 2 * MINUTE) })),
    });
    expect(await consumeRateLimit("k", [{ limit: 2, windowMs: MINUTE }])).toBe(true);
  });

  it("enforces the longer window even when the short one is clear", async () => {
    await prisma.rateLimitHit.createMany({
      data: [1, 2, 3].map(() => ({ key: "k", createdAt: new Date(Date.now() - 10 * MINUTE) })),
    });
    const limits = [
      { limit: 5, windowMs: MINUTE },
      { limit: 3, windowMs: 60 * MINUTE },
    ];
    expect(await consumeRateLimit("k", limits)).toBe(false);
  });
});
