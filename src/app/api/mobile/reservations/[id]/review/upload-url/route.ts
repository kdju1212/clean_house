import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { requestReviewPhotoUploadUrlForUser } from "@/lib/review-service";

/** Step 1 of the app's review-photo upload — same signed-upload-params flow
 * the web review form uses, just bearer-authenticated. */
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
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = typeof body?.size === "number" ? body.size : NaN;

  try {
    const signed = await requestReviewPhotoUploadUrlForUser(userId, {
      reservationId: id,
      contentType,
      size,
    });
    return NextResponse.json(signed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "요청에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
