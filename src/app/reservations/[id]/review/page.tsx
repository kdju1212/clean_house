import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewForm } from "./review-form";

export default async function ReservationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { review: true, company: true },
  });

  if (!reservation || reservation.customerId !== session.user.id) {
    notFound();
  }
  if (reservation.review) {
    redirect(`/companies/${reservation.companyId}`);
  }
  if (reservation.status !== "COMPLETED") {
    redirect("/reservations");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-neutral-400">{reservation.company.name}</p>
      <h1 className="mt-1 text-lg font-bold">리뷰 작성</h1>
      <p className="mt-1 text-sm text-neutral-500">청소는 만족스러우셨나요?</p>

      <ReviewForm reservationId={reservation.id} />
    </main>
  );
}
