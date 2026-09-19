import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { addServiceForOwner } from "@/lib/company-profile-service";

/** Mobile equivalent of the web addService Server Action (also used for
 * updating an existing service's price/description — it's an upsert keyed
 * on categoryId, same as the web form). */
export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    await addServiceForOwner(userId, {
      categoryId: body?.categoryId,
      price: body?.price,
      description: body?.description,
      pricingUnit: body?.pricingUnit,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
