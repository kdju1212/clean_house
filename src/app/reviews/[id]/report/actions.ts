"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";

export async function reportReview(formData: FormData) {
  const session = await requireSession();

  const reviewId = formData.get("reviewId");
  const reason = formData.get("reason");

  if (typeof reviewId !== "string" || reviewId.length === 0) {
    throw new Error("잘못된 요청이에요.");
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("신고 사유를 입력해주세요.");
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new Error("존재하지 않는 리뷰예요.");
  }

  await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType: "REVIEW",
      targetId: review.id,
      reason: reason.trim().slice(0, 500),
    },
  });

  redirect(`/reviews/${review.id}/report?done=1`);
}
