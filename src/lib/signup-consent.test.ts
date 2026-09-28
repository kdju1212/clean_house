import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hasAllRequiredConsents, recordTermsAgreement } from "@/lib/signup-consent";
import { createUser, resetDb } from "@/test/db";

describe("hasAllRequiredConsents", () => {
  it("accepts all three checked, from either the web form or the app", () => {
    expect(hasAllRequiredConsents({ agreeAge: "on", agreeTerms: "on", agreePrivacy: "on" })).toBe(true);
    expect(hasAllRequiredConsents({ agreeAge: true, agreeTerms: true, agreePrivacy: true })).toBe(true);
  });

  it.each([
    { agreeTerms: "on", agreePrivacy: "on" },
    { agreeAge: "on", agreePrivacy: "on" },
    { agreeAge: "on", agreeTerms: "on" },
    { agreeAge: "off", agreeTerms: "on", agreePrivacy: "on" },
    { agreeAge: "true", agreeTerms: true, agreePrivacy: true },
    {},
  ])("rejects anything missing or unchecked (%o)", (values) => {
    expect(hasAllRequiredConsents(values)).toBe(false);
  });
});

describe("recordTermsAgreement", () => {
  beforeEach(resetDb);

  it("records the first agreement time and never overwrites it", async () => {
    const user = await createUser("CUSTOMER");

    await recordTermsAgreement(user.id);
    const first = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(first.termsAgreedAt).toBeInstanceOf(Date);

    await new Promise((r) => setTimeout(r, 10));
    await recordTermsAgreement(user.id);
    const second = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(second.termsAgreedAt).toEqual(first.termsAgreedAt);
  });
});
