import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { cancelReservationForCustomer } from "@/lib/reservation-service";

/** Mobile equivalent of the web /reservations cancelReservation Server
 * Action — only the reservation's own customer, only while it's still
 * REQUESTED or ACCEPTED. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const result = await cancelReservationForCustomer(userId, id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
