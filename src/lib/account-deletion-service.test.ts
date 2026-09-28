import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteAccountForUser } from "@/lib/account-deletion-service";
import { createReservation, createUser, koreaDateStr, resetDb, setupMarketplace } from "@/test/db";

beforeEach(resetDb);

describe("deleteAccountForUser", () => {
  it("anonymizes the user and unlinks OAuth accounts", async () => {
    const customer = await createUser("CUSTOMER");
    await prisma.account.create({
      data: {
        userId: customer.id,
        type: "oauth",
        provider: "kakao",
        providerAccountId: "kakao-123",
      },
    });

    await deleteAccountForUser(customer.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
    expect(after.name).toBe("탈퇴한 회원");
    expect(after.email).toBeNull();
    expect(after.phone).toBeNull();
    expect(after.deletedAt).toBeInstanceOf(Date);
    expect(await prisma.account.count({ where: { userId: customer.id } })).toBe(0);
  });

  it("is idempotent — calling it twice doesn't error or re-touch the row", async () => {
    const customer = await createUser("CUSTOMER");
    await deleteAccountForUser(customer.id);
    const first = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });

    await deleteAccountForUser(customer.id);
    const second = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });

    expect(second.deletedAt).toEqual(first.deletedAt);
  });

  it("cancels open reservations and notifies the company, but leaves a completed one alone", async () => {
    const m = await setupMarketplace();
    const open = await createReservation({
      customerId: m.customer.id,
      companyId: m.company.id,
      categoryId: m.category.id,
      date: koreaDateStr(1),
      status: "ACCEPTED",
    });
    const done = await createReservation({
      customerId: m.customer.id,
      companyId: m.company.id,
      categoryId: m.category.id,
      date: koreaDateStr(-5),
      status: "COMPLETED",
    });

    await deleteAccountForUser(m.customer.id);

    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: open.id } })).status).toBe(
      "CANCELLED"
    );
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: done.id } })).status).toBe(
      "COMPLETED"
    );
    const notified = await prisma.notification.findMany({ where: { userId: m.owner.id } });
    expect(notified.map((n) => n.type)).toEqual(["RESERVATION_CANCELLED"]);
  });

  it("suspends an owned company but keeps its reservations and reviews intact", async () => {
    const m = await setupMarketplace();
    const reservation = await createReservation({
      customerId: m.customer.id,
      companyId: m.company.id,
      categoryId: m.category.id,
      date: koreaDateStr(-5),
      status: "COMPLETED",
    });
    await prisma.review.create({
      data: {
        reservationId: reservation.id,
        companyId: m.company.id,
        customerId: m.customer.id,
        rating: 5,
        content: "좋았어요",
      },
    });

    await deleteAccountForUser(m.owner.id);

    const company = await prisma.company.findUniqueOrThrow({ where: { id: m.company.id } });
    expect(company.status).toBe("SUSPENDED");
    expect(await prisma.reservation.count({ where: { companyId: m.company.id } })).toBe(1);
    expect(await prisma.review.count({ where: { companyId: m.company.id } })).toBe(1);
  });

  it("removes favorites and category profiles, which are purely personal", async () => {
    const m = await setupMarketplace();
    await prisma.favorite.create({
      data: { customerId: m.customer.id, companyId: m.company.id },
    });
    await prisma.categoryProfile.create({
      data: { customerId: m.customer.id, categoryId: m.category.id, answers: { area: "24" } },
    });

    await deleteAccountForUser(m.customer.id);

    expect(await prisma.favorite.count({ where: { customerId: m.customer.id } })).toBe(0);
    expect(await prisma.categoryProfile.count({ where: { customerId: m.customer.id } })).toBe(0);
  });
});
