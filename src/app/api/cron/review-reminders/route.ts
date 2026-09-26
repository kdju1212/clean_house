import { NextResponse } from "next/server";
import { sendDueReviewReminders } from "@/lib/review-reminder";

// Called once a day by Vercel Cron (vercel.json). When CRON_SECRET is set,
// Vercel sends it as a Bearer token and anything else is refused; without
// it the endpoint stays open, which is harmless since the job only sends
// reminders that are already due and never the same one twice.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendDueReviewReminders();
  return NextResponse.json(result);
}
