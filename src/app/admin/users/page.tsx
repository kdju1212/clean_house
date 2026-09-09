import Link from "next/link";
import { prisma } from "@/lib/prisma";

const ROLE_FILTERS = [
  { value: "", label: "전체" },
  { value: "CUSTOMER", label: "고객" },
  { value: "COMPANY", label: "업체" },
  { value: "ADMIN", label: "관리자" },
] as const;

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "고객",
  COMPANY: "업체",
  ADMIN: "관리자",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  CUSTOMER: "bg-neutral-100 text-neutral-600",
  COMPANY: "bg-blue-100 text-blue-700",
  ADMIN: "bg-amber-100 text-amber-700",
};

type RoleFilterValue = (typeof ROLE_FILTERS)[number]["value"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: rawRole } = await searchParams;
  const activeRole: RoleFilterValue = ROLE_FILTERS.some((f) => f.value === rawRole)
    ? (rawRole as RoleFilterValue)
    : "";

  const [users, roleCounts] = await Promise.all([
    prisma.user.findMany({
      where: activeRole ? { role: activeRole } : {},
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
  ]);
  const countByRole = new Map(roleCounts.map((r) => [r.role, r._count]));
  const totalCount = roleCounts.reduce((sum, r) => sum + r._count, 0);

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold">사용자 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">총 {totalCount}명</p>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {ROLE_FILTERS.map((f) => {
          const count = f.value ? (countByRole.get(f.value) ?? 0) : totalCount;
          return (
            <Link
              key={f.value}
              href={f.value ? `/admin/users?role=${f.value}` : "/admin/users"}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeRole === f.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              {f.label} {count}
            </Link>
          );
        })}
      </div>

      {users.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-400">
          해당하는 사용자가 없어요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {user.name ?? "이름 없음"}
                  {user.role === "COMPANY" && user.company && (
                    <span className="text-neutral-400"> · {user.company.name}</span>
                  )}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {user.email ?? "이메일 없음"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASS[user.role]}`}
              >
                {ROLE_LABEL[user.role]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
