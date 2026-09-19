import "server-only";
import { prisma } from "@/lib/prisma";
import { parseCategoryAnswers } from "@/lib/reservation-questions";

/**
 * A customer's saved answers for one category (e.g. 평수 for 입주청소,
 * 브랜드/형태/대수 for 에어컨청소) — reused across every company's listing
 * in that category to estimate a PER_UNIT price, and to pre-fill the
 * reservation form. Shared by the web "정보입력" flow and the mobile
 * equivalent.
 */
export async function getCategoryProfile(
  customerId: string,
  categorySlug: string
): Promise<Record<string, string> | null> {
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return null;

  const profile = await prisma.categoryProfile.findUnique({
    where: { customerId_categoryId: { customerId, categoryId: category.id } },
  });
  return (profile?.answers as Record<string, string> | null | undefined) ?? null;
}

/** Every saved profile at once, keyed by category slug — used by the
 * listing pages to compute PER_UNIT estimates for whichever categories a
 * company offers, without a round trip per category. */
export async function getAllCategoryProfiles(
  customerId: string
): Promise<Record<string, Record<string, string>>> {
  const profiles = await prisma.categoryProfile.findMany({
    where: { customerId },
    include: { category: true },
  });
  return Object.fromEntries(
    profiles.map((p) => [p.category.slug, p.answers as Record<string, string>])
  );
}

export async function saveCategoryProfile(
  customerId: string,
  categorySlug: string,
  raw: Record<string, unknown>
): Promise<Record<string, string>> {
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) throw new Error("존재하지 않는 카테고리입니다.");

  const answers = parseCategoryAnswers(categorySlug, raw);
  if (!answers) {
    throw new Error("이 카테고리는 저장할 추가 정보가 없어요.");
  }

  await prisma.categoryProfile.upsert({
    where: { customerId_categoryId: { customerId, categoryId: category.id } },
    create: { customerId, categoryId: category.id, answers },
    update: { answers },
  });

  return answers;
}
