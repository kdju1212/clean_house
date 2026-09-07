"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";
import { requireReviewableReservation } from "@/lib/review";
import { createPresignedUploadUrl } from "@/lib/r2";
import { assertValidImageMeta, IMAGE_EXT_BY_TYPE } from "@/lib/image";

export async function requestReviewPhotoUploadUrl(input: {
  reservationId: string;
  contentType: string;
  size: number;
}) {
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
    input.contentType
  );

  return { uploadUrl, publicUrl, key };
}

export async function createReview(input: {
  reservationId: string;
  rating: number;
  content: string;
  photoUrl?: string | null;
}) {
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
  const photoUrl =
    input.photoUrl && input.photoUrl.includes(`/reviews/${reservation.id}/`)
      ? input.photoUrl
      : null;

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
}
