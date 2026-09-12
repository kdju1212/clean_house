"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";
import { requireReviewableReservation } from "@/lib/review";
import {
  cloudinaryDeliveryUrl,
  createSignedUploadParams,
  deleteCloudinaryObject,
  fetchCloudinaryBuffer,
  getCloudinaryCloudName,
  getCloudinaryResource,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary";
import { assertValidImageMeta, assertValidUploadedImage } from "@/lib/image";
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
}): Promise<
  | { error: string }
  | { cloudName: string; apiKey: string; timestamp: number; signature: string; publicId: string }
> {
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

    const publicId = `reviews/${reservation.id}/${randomUUID()}`;
    return createSignedUploadParams(publicId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

export async function createReview(input: {
  reservationId: string;
  rating: number;
  content: string;
  publicId?: string | null;
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
    // uploaded — never trust an arbitrary public_id from the client.
    const originalPublicId =
      input.publicId && input.publicId.startsWith(`reviews/${reservation.id}/`)
        ? input.publicId
        : null;

    // Re-check what was actually stored in Cloudinary (never the client's
    // earlier claims) before letting the review reference it. A photo that
    // fails this — or that fails the WebP re-encode below — is dropped
    // rather than blocking the whole review, and any bad/orphaned object
    // is deleted instead of being left behind.
    let photoUrl: string | null = null;
    if (originalPublicId) {
      const resource = await getCloudinaryResource(originalPublicId);
      let validOriginal = true;
      try {
        assertValidUploadedImage(
          resource ? { contentLength: resource.bytes, contentType: resource.contentType } : null
        );
      } catch {
        validOriginal = false;
        await deleteCloudinaryObject(originalPublicId).catch(() => {});
      }

      if (validOriginal && resource) {
        // Re-encode server-side into a resized WebP — same policy as
        // company photos — rather than keeping the browser-uploaded
        // original. The original is always deleted once we're done with
        // it, whether the re-encode succeeds or not.
        const finalPublicId = `reviews/${reservation.id}/${randomUUID()}`;
        try {
          const original = await fetchCloudinaryBuffer(resource.secureUrl);
          const webp = await processImageToWebp(original);
          await uploadBufferToCloudinary(finalPublicId, webp, "image/webp");
          const finalResource = await getCloudinaryResource(finalPublicId);
          assertValidUploadedImage(
            finalResource
              ? { contentLength: finalResource.bytes, contentType: finalResource.contentType }
              : null
          );
          photoUrl = cloudinaryDeliveryUrl(getCloudinaryCloudName(), finalPublicId, "webp");
        } catch {
          await deleteCloudinaryObject(finalPublicId).catch(() => {});
        } finally {
          await deleteCloudinaryObject(originalPublicId).catch(() => {});
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
