"use server";

import { auth } from "@/lib/auth";
import { deleteCategoryProfile, saveCategoryProfile } from "@/lib/category-profile-service";
import { toActionError, type ActionState } from "@/lib/action-state";

/** Called directly (not via <form action>) from CategoryProfileButton, a
 * client-side modal that needs to know exactly when the save succeeded so
 * it can close itself — see company-page-preview.tsx's handleSave for the
 * same pattern used elsewhere in this app. */
export async function saveMyCategoryProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("로그인이 필요합니다.");
    }

    const categorySlug = formData.get("categorySlug");
    if (typeof categorySlug !== "string" || categorySlug.length === 0) {
      throw new Error("잘못된 요청입니다.");
    }

    const raw: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (key === "categorySlug") continue;
      raw[key] = value;
    }

    await saveCategoryProfile(session.user.id, categorySlug, raw);
  } catch (err) {
    return toActionError(err);
  }
}

/** Called directly (not via <form action>) from CategoryProfileButton's
 * "초기화" button — plain args instead of FormData since there's nothing
 * else to send. */
export async function deleteMyCategoryProfile(categorySlug: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("로그인이 필요합니다.");
    }
    await deleteCategoryProfile(session.user.id, categorySlug);
  } catch (err) {
    return toActionError(err);
  }
}
