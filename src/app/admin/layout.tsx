import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/companies", label: "업체" },
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/reservations", label: "예약" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1">
      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 pt-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
