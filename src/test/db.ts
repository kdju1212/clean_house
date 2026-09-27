import { prisma } from "@/lib/prisma";
import { koreaTodayStr } from "@/lib/company-schedule-service";
import type { Prisma, ReservationStatus } from "@/generated/prisma/client";

/** Empties every table (the migrations table aside) so each test starts clean. */
export async function resetDb() {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`
  );
}

/** Korea's date `days` from today, as "YYYY-MM-DD". */
export function koreaDateStr(days: number): string {
  const [y, m, d] = koreaTodayStr().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

let seq = 0;

export async function createUser(role: "CUSTOMER" | "COMPANY" | "ADMIN" = "CUSTOMER") {
  seq += 1;
  return prisma.user.create({
    data: { role, name: `${role}${seq}`, email: `user${seq}@test.local` },
  });
}

/**
 * A ready-to-book marketplace: a 시/도 > 시/군/구 > 읍/면/동 region chain,
 * one category, a customer living in the 동, and an ACTIVE company that
 * serves the whole 시/군/구 (so the customer's 동 is covered through its
 * ancestor) with that category at 100,000원.
 */
export async function setupMarketplace(
  companyOverrides: Partial<Prisma.CompanyUncheckedCreateInput> = {}
) {
  const sido = await prisma.region.create({ data: { name: "서울특별시", level: "SIDO" } });
  const sigungu = await prisma.region.create({
    data: { name: "강남구", level: "SIGUNGU", parentId: sido.id },
  });
  const dong = await prisma.region.create({
    data: { name: "역삼동", level: "EUPMYEONDONG", parentId: sigungu.id },
  });
  const category = await prisma.category.create({ data: { slug: "etc", name: "기타청소" } });

  const customer = await createUser("CUSTOMER");
  const owner = await createUser("COMPANY");
  const company = await prisma.company.create({
    data: {
      ownerUserId: owner.id,
      name: "깨끗한청소",
      status: "ACTIVE",
      ...companyOverrides,
      services: { create: { categoryId: category.id, price: 100_000 } },
      regions: { create: { regionId: sigungu.id } },
    },
  });

  return { sido, sigungu, dong, category, customer, owner, company };
}

export async function createReservation(input: {
  customerId: string;
  companyId: string;
  categoryId: string;
  date: string;
  time?: string;
  status?: ReservationStatus;
}) {
  return prisma.reservation.create({
    data: {
      customerId: input.customerId,
      companyId: input.companyId,
      customerName: "홍길동",
      customerPhone: "010-1234-5678",
      address: "서울 강남구 테헤란로 1",
      desiredDate: new Date(`${input.date}T00:00:00.000Z`),
      desiredTime: input.time ?? "10:00",
      status: input.status ?? "REQUESTED",
      price: 100_000,
      items: { create: { categoryId: input.categoryId, price: 100_000 } },
      chatRoom: { create: {} },
    },
  });
}
