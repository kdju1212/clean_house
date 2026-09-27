import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notification";

/**
 * The write side of admin/companies' Server Actions, pulled out so the
 * mobile admin API routes (src/app/api/mobile/admin/companies/...) can call
 * the exact same transition + notification logic instead of a second,
 * drifting copy. The caller (a Server Action or a mobile route) is always
 * the one that verified the request is actually from an admin — these
 * functions don't re-check that themselves, same division of
 * responsibility as e.g. sendChatMessageForUser vs. its callers' auth.
 */
export type AdminCompanyServiceResult = { error?: string };

export async function approveCompanyForAdmin(companyId: string): Promise<AdminCompanyServiceResult> {
  const result = await prisma.company.updateMany({
    where: { id: companyId, status: "PENDING" },
    data: { status: "ACTIVE" },
  });
  if (result.count === 0) {
    return { error: "이미 상태가 변경되었거나 존재하지 않는 업체예요." };
  }
  return {};
}

/** 정지 needs a reason (shown to the owner and kept on the company row). */
export async function suspendCompanyForAdmin(
  companyId: string,
  rawReason: unknown
): Promise<AdminCompanyServiceResult> {
  if (typeof rawReason !== "string" || rawReason.trim().length === 0) {
    return { error: "정지 사유를 입력해주세요." };
  }
  const reason = rawReason.trim().slice(0, 500);

  const result = await prisma.company.updateMany({
    where: { id: companyId, status: "ACTIVE" },
    data: { status: "SUSPENDED", suspendedReason: reason },
  });
  if (result.count === 0) {
    return { error: "이미 상태가 변경되었거나 존재하지 않는 업체예요." };
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  await createNotification({
    userId: company.ownerUserId,
    type: "COMPANY_SUSPENDED",
    title: "업체가 정지되었어요",
    body: reason,
    link: "/company",
  });

  return {};
}

export async function reactivateCompanyForAdmin(companyId: string): Promise<AdminCompanyServiceResult> {
  const result = await prisma.company.updateMany({
    where: { id: companyId, status: "SUSPENDED" },
    data: { status: "ACTIVE", suspendedReason: null },
  });
  if (result.count === 0) {
    return { error: "이미 상태가 변경되었거나 존재하지 않는 업체예요." };
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  await createNotification({
    userId: company.ownerUserId,
    type: "COMPANY_REACTIVATED",
    title: "업체 정지가 해제됐어요",
    body: "다시 예약을 받을 수 있어요.",
    link: "/company",
  });

  return {};
}

export async function setCompanyVerifiedForAdmin(
  companyId: string,
  isVerified: boolean
): Promise<AdminCompanyServiceResult> {
  await prisma.company.update({ where: { id: companyId }, data: { isVerified } });
  return {};
}

const STATUS_VALUES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export type AdminCompanyStatusFilter = (typeof STATUS_VALUES)[number];

export function parseCompanyStatusFilter(value: unknown): AdminCompanyStatusFilter | undefined {
  return STATUS_VALUES.includes(value as AdminCompanyStatusFilter)
    ? (value as AdminCompanyStatusFilter)
    : undefined;
}

/** Flattened list shape for the mobile admin company list screen — the web
 * page queries its own (richer, JSX-shaped) version directly since it
 * renders straight from Prisma include objects. */
export async function listCompaniesForAdminMobile(status?: AdminCompanyStatusFilter) {
  const companies = await prisma.company.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true, email: true } },
      services: { include: { category: true } },
      regions: { include: { region: true } },
    },
  });

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    isVerified: c.isVerified,
    hasBusinessRegistration: Boolean(c.businessRegistrationNumber),
    phone: c.phone,
    ownerName: c.owner.name,
    ownerEmail: c.owner.email,
    createdAt: c.createdAt.toISOString(),
    categoryNames: c.services.map((s) => s.category.name),
    regionNames: c.regions.map((r) => r.region.name),
  }));
}

export async function getCompanyDetailForAdminMobile(companyId: string) {
  const [company, reservationCounts, ratingSummary] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: { select: { name: true, email: true } },
        services: { include: { category: true } },
        regions: { include: { region: true } },
      },
    }),
    prisma.reservation.groupBy({ by: ["status"], where: { companyId }, _count: true }),
    prisma.review.aggregate({ where: { companyId }, _avg: { rating: true }, _count: true }),
  ]);
  if (!company) return null;

  const countByStatus = new Map(reservationCounts.map((r) => [r.status, r._count]));

  return {
    id: company.id,
    name: company.name,
    status: company.status,
    isVerified: company.isVerified,
    businessRegistrationNumber: company.businessRegistrationNumber,
    representativeName: company.representativeName,
    phone: company.phone,
    ownerName: company.owner.name,
    ownerEmail: company.owner.email,
    createdAt: company.createdAt.toISOString(),
    businessHours: company.businessHours,
    isAvailable: company.isAvailable,
    introText: company.introText,
    suspendedReason: company.suspendedReason,
    averageRating: ratingSummary._avg.rating ?? 0,
    reviewCount: ratingSummary._count,
    reservationCounts: {
      requested: countByStatus.get("REQUESTED") ?? 0,
      accepted: countByStatus.get("ACCEPTED") ?? 0,
      completed: countByStatus.get("COMPLETED") ?? 0,
      rejectedOrCancelled:
        (countByStatus.get("REJECTED") ?? 0) + (countByStatus.get("CANCELLED") ?? 0),
      noShow: countByStatus.get("NO_SHOW") ?? 0,
    },
    services: company.services.map((s) => ({ categoryName: s.category.name, price: s.price })),
    regionNames: company.regions.map((r) => r.region.name),
  };
}
