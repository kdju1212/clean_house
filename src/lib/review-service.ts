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

const MAX_REVIEW_PHOTOS = 5;

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

/** Re-verifies one already-uploaded Cloudinary object (never trusting the
 * client's claim that it's valid), re-encodes it into a resized WebP, and
 * returns the final delivery URL — or null if anything about it was bad.
 * Always cleans up both the original and (on failure) the re-encoded
 * object, so nothing orphaned is left behind either way. */
async function verifyAndReencodeReviewPhoto(
  reservationId: string,
  originalPublicId: string
): Promise<string | null> {
  const resource = await getCloudinaryResource(originalPublicId);
  try {
    assertValidUploadedImage(
      resource ? { contentLength: resource.bytes, contentType: resource.contentType } : null
    );
  } catch {
    await deleteCloudinaryObject(originalPublicId).catch(() => {});
    return null;
  }
  if (!resource) {
    await deleteCloudinaryObject(originalPublicId).catch(() => {});
    return null;
  }

  // Re-encode server-side into a resized WebP — same policy as company
  // photos — rather than keeping the browser-uploaded original.
  const finalPublicId = `reviews/${reservationId}/${randomUUID()}`;
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
    return cloudinaryDeliveryUrl(getCloudinaryCloudName(), finalPublicId, "webp");
  } catch {
    await deleteCloudinaryObject(finalPublicId).catch(() => {});
    return null;
  } finally {
    await deleteCloudinaryObject(originalPublicId).catch(() => {});
  }
}

export async function createReviewForUser(
  userId: string,
  input: {
    reservationId: string;
    rating: number;
    content: string;
    // Up to MAX_REVIEW_PHOTOS Cloudinary public_ids from
    // requestReviewPhotoUploadUrlForUser calls — one per attached photo.
    publicIds?: (string | null | undefined)[];
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

  // Each photo, if any, must actually be one this reservation's review just
  // uploaded — never trust an arbitrary public_id from the client.
  const originalPublicIds = (input.publicIds ?? [])
    .filter(
      (id): id is string =>
        typeof id === "string" && id.startsWith(`reviews/${reservation.id}/`)
    )
    .slice(0, MAX_REVIEW_PHOTOS);

  // Sequential rather than Promise.all — these already hit Cloudinary
  // (upload + resource lookup + re-encode) several times each, and nothing
  // here is on a user-facing latency budget tight enough to need the
  // parallelism.
  const photoUrls: string[] = [];
  for (const originalPublicId of originalPublicIds) {
    const url = await verifyAndReencodeReviewPhoto(reservation.id, originalPublicId);
    if (url) photoUrls.push(url);
  }

  await prisma.review.create({
    data: {
      reservationId: reservation.id,
      companyId: reservation.companyId,
      customerId: userId,
      rating: input.rating,
      content,
      photos: { create: photoUrls.map((url, order) => ({ url, order })) },
    },
  });

  return { companyId: reservation.companyId };
}
