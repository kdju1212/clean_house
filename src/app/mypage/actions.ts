"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { updateCustomerPhone } from "@/lib/customer-profile-service";
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
