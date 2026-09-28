"use server";

import { signIn } from "@/lib/auth";
import { hasAllRequiredConsents } from "@/lib/signup-consent";
import type { ActionState } from "@/lib/action-state";

const PROVIDERS = ["google", "kakao", "naver"] as const;

export async function socialSignIn(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Checked here, not just by the disabled button, so a login can't start
  // without consent — auth.ts then records termsAgreedAt once it lands.
  if (!hasAllRequiredConsents(Object.fromEntries(formData))) {
    return { error: "필수 항목에 모두 동의해주세요." };
  }

  const provider = formData.get("provider");
  if (typeof provider !== "string" || !(PROVIDERS as readonly string[]).includes(provider)) {
    return { error: "잘못된 로그인 방식이에요." };
  }

  const rawRedirect = formData.get("redirectTo");
  const redirectTo =
    typeof rawRedirect === "string" && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  // Throws a redirect to the provider, so it has to stay outside any
  // try/catch (see action-state.ts).
  await signIn(provider, { redirectTo });
}
