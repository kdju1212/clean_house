import { NextResponse } from "next/server";
import { getBlockedTimesForDate } from "@/lib/reservation-service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Public, read-only — which of this company's TIME_SLOTS are already
 * taken on a given date, so the booking form can gray them out before
 * the customer even tries. createReservationForCustomer re-checks this
 * regardless at submit time. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const date = searchParams.get("date");
  if (!companyId || !date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const times = await getBlockedTimesForDate(companyId, date);
  return NextResponse.json({ times });
}
