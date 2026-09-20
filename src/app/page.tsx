import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * The old "전체" (all-categories-merged) home view is gone — / just sends
 * the customer straight into the first category's own listing page, which
 * already handles "지역을 먼저 선택해주세요" when no region is set yet.
 */
export default async function Home() {
  const firstCategory = await prisma.category.findFirst({ orderBy: { order: "asc" } });
  if (!firstCategory) notFound();
  redirect(`/categories/${firstCategory.slug}`);
}
