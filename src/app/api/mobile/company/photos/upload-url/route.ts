import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { requestPhotoUploadUrlForOwner } from "@/lib/company-profile-service";

/** Step 1 of the app's company-photo upload — same signed-upload-params
 * flow the web photo-upload form uses. */
export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = typeof body?.size === "number" ? body.size : NaN;

  try {
    const signed = await requestPhotoUploadUrlForOwner(userId, { contentType, size });
    return NextResponse.json(signed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "요청에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
