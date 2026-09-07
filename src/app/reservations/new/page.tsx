import Link from "next/link";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-3xl">🚧</p>
      <h1 className="text-lg font-bold">예약 기능은 준비 중이에요</h1>
      <p className="text-sm text-neutral-500">
        곧 전화 없이 바로 예약을 신청할 수 있도록 준비하고 있어요. 조금만
        기다려주세요.
      </p>
      {companyId && (
        <Link
          href={`/companies/${companyId}`}
          className="mt-4 text-sm font-medium underline"
        >
          업체 페이지로 돌아가기
        </Link>
      )}
    </main>
  );
}
