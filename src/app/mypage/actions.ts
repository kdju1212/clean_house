"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { updateCustomerPhone } from "@/lib/customer-profile-service";
import { deleteAccountForUser } from "@/lib/account-deletion-service";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function updatePhone(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("로그인이 필요합니다.");
    }

    await updateCustomerPhone(session.user.id, formData.get("phone"));

    revalidatePath("/mypage");
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAccount(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("로그인이 필요합니다.");
    }
    if (formData.get("confirm") !== "on") {
      throw new Error("탈퇴 확인에 동의해주세요.");
    }

    await deleteAccountForUser(session.user.id);
  } catch (err) {
    return toActionError(err);
  }

  // signOut() itself throws a redirect, so it must run outside the catch
  // above (same reasoning as redirect() in createReservation, see
  // action-state.ts).
  await signOut({ redirectTo: "/" });
}
