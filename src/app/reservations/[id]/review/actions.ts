"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/company-auth";
import {
  createReviewForUser,
  requestReviewPhotoUploadUrlForUser,
} from "@/lib/review-service";

/**
 * Called directly from a Client Component (not a <form action>), but the
 * same production redaction applies to thrown errors from any Server
 * Function — so this also returns an error string instead of throwing.
 */
export async function requestReviewPhotoUploadUrl(input: {
  reservationId: string;
  contentType: string;
  size: number;
}): Promise<
  | { error: string }
  | { cloudName: string; apiKey: string; timestamp: number; signature: string; publicId: string }
> {
  try {
    const session = await requireSession();
    return await requestReviewPhotoUploadUrlForUser(session.user.id, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

export async function createReview(input: {
  reservationId: string;
  rating: number;
  content: string;
  publicIds?: (string | null | undefined)[];
}): Promise<{ error: string } | { companyId: string }> {
  try {
    const session = await requireSession();
    const result = await createReviewForUser(session.user.id, input);

    revalidatePath(`/companies/${result.companyId}`);
    revalidatePath("/reservations");

    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}
