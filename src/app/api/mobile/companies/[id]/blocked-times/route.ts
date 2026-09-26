import { NextResponse } from "next/server";
import { getBlockedTimesForDate } from "@/lib/reservation-service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Mobile equivalent of /api/reservations/blocked-times — same public,
 * read-only lookup, just keyed by the path param the app's other
 * company-detail calls already use. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const times = await getBlockedTimesForDate(id, date);
  return NextResponse.json({ times });
}
