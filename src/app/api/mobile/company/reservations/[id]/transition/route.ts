import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { transitionReservationForOwner } from "@/lib/company-reservation-service";

const ACTIONS = {
  accept: { from: "REQUESTED", to: "ACCEPTED" },
  reject: { from: "REQUESTED", to: "REJECTED" },
  complete: { from: "ACCEPTED", to: "COMPLETED" },
} as const;

/** Mobile equivalent of the web accept/reject/completeReservation Server
 * Actions — same shared core (transitionReservationForOwner), so the
 * ownership check and from-status guard behave identically. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (typeof action !== "string" || !(action in ACTIONS)) {
    return NextResponse.json({ error: "올바르지 않은 요청이에요." }, { status: 400 });
  }

  const { id } = await params;
  const { from, to } = ACTIONS[action as keyof typeof ACTIONS];
  const priceRaw = body?.price;
  const price = typeof priceRaw === "number" ? priceRaw : undefined;

  try {
    const result = await transitionReservationForOwner(userId, id, from, to, price);
    if (!result.updated) {
      return NextResponse.json(
        { error: "처리할 수 없는 예약 상태예요." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "처리에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
