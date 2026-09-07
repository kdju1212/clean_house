import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveCompany, reactivateCompany, suspendCompany } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사중",
  ACTIVE: "활성",
  SUSPENDED: "비활성화",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-neutral-200 text-neutral-600",
};

export default async function AdminCompaniesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
      services: { include: { category: true } },
      regions: { include: { region: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">업체 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">총 {companies.length}개 업체</p>

      {companies.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          등록된 업체가 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {companies.map((company) => (
            <li
              key={company.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{company.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[company.status]}`}
                >
                  {STATUS_LABEL[company.status]}
                </span>
              </div>

              <dl className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
                <div>
                  등록일 {company.createdAt.toLocaleDateString("ko-KR")}
                </div>
                <div>
                  소유자 {company.owner.name ?? "-"} (
                  {company.owner.email ?? "이메일 없음"})
                </div>
                <div>
                  서비스{" "}
                  {company.services.map((s) => s.category.name).join(", ") ||
                    "-"}
                </div>
                <div>
                  지역{" "}
                  {company.regions.map((r) => r.region.name).join(", ") ||
                    "-"}
                </div>
              </dl>

              <div className="mt-3 flex gap-2">
                {company.status === "PENDING" && (
                  <form action={approveCompany}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      승인
                    </button>
                  </form>
                )}
                {company.status === "ACTIVE" && (
                  <form action={suspendCompany}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
                    >
                      비활성화
                    </button>
                  </form>
                )}
                {company.status === "SUSPENDED" && (
                  <form action={reactivateCompany}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-neutral-900 px-3 py-1.5 text-xs font-medium"
                    >
                      재활성화
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
