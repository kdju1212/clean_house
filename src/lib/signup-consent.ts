import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The three required checkboxes on the login screen (web and app). Social
 * login doubles as signup, so these are asked before every login rather
 * than on a separate signup step.
 */
export const REQUIRED_CONSENTS = ["agreeAge", "agreeTerms", "agreePrivacy"] as const;

/** A checked web checkbox arrives as "on"; the app sends JSON `true`. */
export function hasAllRequiredConsents(values: Record<string, unknown>): boolean {
  return REQUIRED_CONSENTS.every((key) => values[key] === "on" || values[key] === true);
}

/** Records when this account first agreed — never overwritten, so it stays
 * the original consent time across later logins. */
export async function recordTermsAgreement(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, termsAgreedAt: null },
    data: { termsAgreedAt: new Date() },
  });
}
