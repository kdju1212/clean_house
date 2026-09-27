"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/company-auth";
import { replyToReviewForOwner, deleteReviewReplyForOwner } from "@/lib/review-service";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function replyToReview(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();

    const reviewId = formData.get("reviewId");
    if (typeof reviewId !== "string" || reviewId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }

    const result = await replyToReviewForOwner(session.user.id, reviewId, formData.get("reply"));
    if (result.error) throw new Error(result.error);

    revalidatePath("/company/reviews");
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteReviewReply(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();

    const reviewId = formData.get("reviewId");
    if (typeof reviewId !== "string" || reviewId.length === 0) {
      throw new Error("잘못된 요청이에요.");
    }

    const result = await deleteReviewReplyForOwner(session.user.id, reviewId);
    if (result.error) throw new Error(result.error);

    revalidatePath("/company/reviews");
  } catch (err) {
    return toActionError(err);
  }
}
