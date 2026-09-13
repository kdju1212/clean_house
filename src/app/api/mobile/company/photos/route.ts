import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { confirmPhotoUploadForOwner } from "@/lib/company-profile-service";

/** Step 2 of the app's company-photo upload — confirms the Cloudinary
 * upload and records the photo, same as the web confirmPhotoUpload
 * Server Action. */
export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const publicId = typeof body?.publicId === "string" ? body.publicId : "";
  const type = typeof body?.type === "string" ? body.type : undefined;

  try {
    await confirmPhotoUploadForOwner(userId, { publicId, type });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
