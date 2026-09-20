import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import {
  deleteCategoryProfile,
  getCategoryProfile,
  saveCategoryProfile,
} from "@/lib/category-profile-service";

/** Mobile equivalent of the web "정보입력" panel's read/write pair. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { slug } = await params;
  const answers = await getCategoryProfile(userId, slug);
  return NextResponse.json({ answers });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const answers = await saveCategoryProfile(userId, slug, body as Record<string, unknown>);
    return NextResponse.json({ answers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** The app's "초기화" button. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { slug } = await params;
  try {
    await deleteCategoryProfile(userId, slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "초기화에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
