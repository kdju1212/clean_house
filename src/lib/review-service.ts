import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
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
 * Core review logic shared by the web Server Actions
 * (src/app/reservations/[id]/review/actions.ts) and the mobile API routes —
 * same eligibility check (COMPLETED, own reservation, not already
 * reviewed), same photo re-verify/re-encode pipeline. Callers differ only
 * in how they resolve the caller's userId (cookie session vs bearer token)
 * and in web-only concerns like revalidatePath, which stay in the action
 * wrapper rather than here.
 */
export async function requestReviewPhotoUploadUrlForUser(
  userId: string,
  input: { reservationId: string; contentType: string; size: number }
) {
  const reservation = await requireReviewableReservation(input.reservationId, userId);
  if (!reservation) {
    throw new Error("리뷰를 작성할 수 없는 예약이에요.");
  }

  assertValidImageMeta(input.contentType, input.size);

  const publicId = `reviews/${reservation.id}/${randomUUID()}`;
  return createSignedUploadParams(publicId);
}

export async function createReviewForUser(
  userId: string,
  input: {
    reservationId: string;
    rating: number;
    content: string;
    publicId?: string | null;
  }
): Promise<{ companyId: string }> {
  const reservation = await requireReviewableReservation(input.reservationId, userId);
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
  // fails this — or that fails the WebP re-encode below — is dropped rather
  // than blocking the whole review, and any bad/orphaned object is deleted
  // instead of being left behind.
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
      // Re-encode server-side into a resized WebP — same policy as company
      // photos — rather than keeping the browser-uploaded original. The
      // original is always deleted once we're done with it, whether the
      // re-encode succeeds or not.
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
      customerId: userId,
      rating: input.rating,
      content,
      photoUrl,
    },
  });

  return { companyId: reservation.companyId };
}
