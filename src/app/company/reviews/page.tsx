import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listReviewsForOwner } from "@/lib/review-service";
import { ReplyForm } from "./reply-form";

export default async function CompanyReviewsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/company/reviews");
  }

  let reviews: Awaited<ReturnType<typeof listReviewsForOwner>>;
  try {
    reviews = await listReviewsForOwner(session.user.id);
  } catch {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-lg font-bold">리뷰 관리</h1>
        <p className="mt-2 text-sm text-neutral-500">아직 등록된 업체가 없어요.</p>
        <Link
          href="/company/register"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          업체 등록하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">리뷰 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">
        고객이 남긴 리뷰에 답글을 달 수 있어요. 답글은 고객에게도 공개돼요.
      </p>

      {reviews.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">아직 작성된 리뷰가 없어요.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-neutral-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-amber-500">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
                <span className="text-xs text-neutral-400">
                  {review.createdAt.toLocaleDateString("ko-KR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{review.customer.name ?? "익명"}</p>
              <p className="mt-2 text-sm text-neutral-700">{review.content}</p>
              {review.hidden && (
                <p className="mt-1 text-xs font-medium text-red-500">숨김 처리된 리뷰예요.</p>
              )}

              <ReplyForm reviewId={review.id} existingReply={review.ownerReply} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
