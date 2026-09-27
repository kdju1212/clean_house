import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { listReviewsForOwner } from "@/lib/review-service";

/** Mobile equivalent of the web /company/reviews management page. */
export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const reviews = await listReviewsForOwner(userId);
    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        customerName: r.customer.name,
        createdAt: r.createdAt.toISOString(),
        hidden: r.hidden,
        photoUrls: r.photos.length > 0 ? r.photos.map((p) => p.url) : r.photoUrl ? [r.photoUrl] : [],
        ownerReply: r.ownerReply,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "불러오지 못했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
