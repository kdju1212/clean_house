"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";
import { requireReviewableReservation } from "@/lib/review";
import {
  createPresignedUploadUrl,
  deleteR2Object,
  getR2ObjectBuffer,
  headR2Object,
  putR2Object,
  r2KeyFromPublicUrl,
} from "@/lib/r2";
import { assertValidImageMeta, assertValidUploadedImage, IMAGE_EXT_BY_TYPE } from "@/lib/image";
import { processImageToWebp } from "@/lib/image-process";

/**
 * Called directly from a Client Component (not a <form action>), but the
 * same production redaction applies to thrown errors from any Server
 * Function — so this also returns an error string instead of throwing.
 */
export async function requestReviewPhotoUploadUrl(input: {
  reservationId: string;
  contentType: string;
  size: number;
}): Promise<{ error: string } | { uploadUrl: string; publicUrl: string; key: string }> {
  try {
    const session = await requireSession();
    const reservation = await requireReviewableReservation(
      input.reservationId,
      session.user.id
    );
    if (!reservation) {
      throw new Error("리뷰를 작성할 수 없는 예약이에요.");
    }

    assertValidImageMeta(input.contentType, input.size);

    const ext = IMAGE_EXT_BY_TYPE[input.contentType];
    const key = `reviews/${reservation.id}/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(
      key,
      input.contentType,
      input.size
    );

    return { uploadUrl, publicUrl, key };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

export async function createReview(input: {
  reservationId: string;
  rating: number;
  content: string;
  photoUrl?: string | null;
}): Promise<{ error: string } | { companyId: string }> {
  try {
    const session = await requireSession();
    const reservation = await requireReviewableReservation(
      input.reservationId,
      session.user.id
    );
    if (!reservation) {
      throw new Error("리뷰를 작성할 수 없는 예약이에요.");
    }

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new Error("평점을 선택해주세요.");
    }
    const content = input.content.trim();
    if (content.length === 0) {
      throw new Error("리뷰 내용을 입력해주세요.");
    }
    if (content.length > 2000) {
      throw new Error("리뷰가 너무 길어요.");
    }

    // The photo, if any, must actually be one this reservation's review just
    // uploaded — never trust an arbitrary URL from the client.
    let photoUrl =
      input.photoUrl && input.photoUrl.includes(`/reviews/${reservation.id}/`)
        ? input.photoUrl
        : null;

    // Re-check what was actually stored in R2 (never the client's earlier
    // claims) before letting the review reference it. A photo that fails
    // this — or that fails the WebP re-encode below — is dropped rather
    // than blocking the whole review, and any bad/orphaned object is
    // deleted instead of being left behind.
    if (photoUrl) {
      const originalKey = r2KeyFromPublicUrl(photoUrl);
      const meta = originalKey ? await headR2Object(originalKey) : null;
      let validOriginal = true;
      try {
        assertValidUploadedImage(meta);
      } catch {
        validOriginal = false;
        if (originalKey) await deleteR2Object(originalKey).catch(() => {});
      }

      photoUrl = null;
      if (validOriginal && originalKey) {
        // Re-encode server-side into a resized WebP — same policy as
        // company photos — rather than keeping the browser-uploaded
        // original. The original is always deleted once we're done with
        // it, whether the re-encode succeeds or not.
        const finalKey = `reviews/${reservation.id}/${randomUUID()}.webp`;
        const publicUrlBase = process.env.R2_PUBLIC_URL;
        try {
          const original = await getR2ObjectBuffer(originalKey);
          const webp = await processImageToWebp(original);
          await putR2Object(finalKey, webp, "image/webp");
          assertValidUploadedImage(await headR2Object(finalKey));
          if (publicUrlBase) {
            photoUrl = `${publicUrlBase.replace(/\/$/, "")}/${finalKey}`;
          } else {
            await deleteR2Object(finalKey).catch(() => {});
          }
        } catch {
          await deleteR2Object(finalKey).catch(() => {});
        } finally {
          await deleteR2Object(originalKey).catch(() => {});
        }
      }
    }

    await prisma.review.create({
      data: {
        reservationId: reservation.id,
        companyId: reservation.companyId,
        customerId: session.user.id,
        rating: input.rating,
        content,
        photoUrl,
      },
    });

    revalidatePath(`/companies/${reservation.companyId}`);
    revalidatePath("/reservations");

    return { companyId: reservation.companyId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}
