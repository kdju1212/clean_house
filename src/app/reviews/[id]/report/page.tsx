import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportForm } from "./report-form";

export default async function ReportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const { done } = await searchParams;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) notFound();

  if (done) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="text-3xl">🙏</p>
        <h1 className="text-lg font-bold">신고가 접수됐어요</h1>
        <p className="text-sm text-neutral-500">
          확인 후 필요한 조치를 취할게요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">리뷰 신고</h1>
      <p className="mt-1 text-sm text-neutral-500">
        부적절한 내용이라고 생각되면 신고해주세요.
      </p>

      <ReportForm reviewId={review.id} />
    </main>
  );
}
