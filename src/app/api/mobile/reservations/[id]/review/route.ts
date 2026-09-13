import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { createReviewForUser } from "@/lib/review-service";

/** Mobile equivalent of the web createReview Server Action — same shared
 * core (src/lib/review-service.ts), so eligibility rules and the photo
 * re-verify/re-encode pipeline behave identically. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const rating = typeof body?.rating === "number" ? body.rating : NaN;
  const content = typeof body?.content === "string" ? body.content : "";
  const publicId = typeof body?.publicId === "string" ? body.publicId : null;

  try {
    const result = await createReviewForUser(userId, {
      reservationId: id,
      rating,
      content,
      publicId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "리뷰 등록에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
