import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { createCompany } from "../actions";

export default async function CompanyRegisterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const existing = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
  });
  if (existing) {
    redirect("/company");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">업체 등록</h1>
      <p className="mt-1 text-sm text-neutral-500">
        기본 정보만 먼저 입력해주세요. 서비스·가격·사진은 등록 후 관리
        페이지에서 추가할 수 있어요.
      </p>

      <form action={createCompany} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          업체명
          <input
            name="name"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          연락처
          <input
            name="phone"
            type="tel"
            required
            placeholder="010-0000-0000"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          업체 소개 (선택)
          <textarea
            name="introText"
            rows={3}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          영업시간 (선택)
          <input
            name="businessHours"
            placeholder="예: 09:00 - 18:00"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>

        <SubmitButton
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
          pendingText="등록 중..."
        >
          등록하기
        </SubmitButton>
      </form>
    </main>
  );
}
