import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "./register-form";

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

      <RegisterForm />
    </main>
  );
}
