import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewReservationForm } from "./new-reservation-form";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { companyId } = await searchParams;
  if (!companyId) notFound();

  const [company, me] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: { services: { include: { category: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
  ]);

  if (!company || company.status !== "ACTIVE") notFound();

  if (!company.isAvailable || company.services.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="text-3xl">😥</p>
        <h1 className="text-lg font-bold">지금은 예약을 받지 않는 업체예요</h1>
        <Link
          href={`/companies/${company.id}`}
          className="mt-4 text-sm font-medium underline"
        >
          업체 페이지로 돌아가기
        </Link>
      </main>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-neutral-400">{company.name}</p>
      <h1 className="mt-1 text-lg font-bold">예약 신청</h1>
      <p className="mt-1 text-sm text-neutral-500">
        전화 없이 바로 예약을 신청할 수 있어요. 업체가 확인 후 승인하면
        예약이 확정돼요.
      </p>

      <NewReservationForm
        companyId={company.id}
        services={company.services}
        defaultName={me.name ?? ""}
        defaultPhone={me.phone ?? ""}
        todayStr={todayStr}
      />
    </main>
  );
}
