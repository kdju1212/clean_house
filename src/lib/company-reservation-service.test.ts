import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { transitionReservationForOwner } from "@/lib/company-reservation-service";
import { createReservation, createUser, koreaDateStr, resetDb, setupMarketplace } from "@/test/db";

beforeEach(resetDb);

async function setup() {
  const m = await setupMarketplace();
  const reservation = await createReservation({
    customerId: m.customer.id,
    companyId: m.company.id,
    categoryId: m.category.id,
    date: koreaDateStr(3),
  });
  return { ...m, reservation };
}

async function customerNotificationTypes(customerId: string) {
  const rows = await prisma.notification.findMany({
    where: { userId: customerId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((n) => n.type);
}

describe("transitionReservationForOwner", () => {
  it("accepts with a corrected quote and tells the customer", async () => {
    const { owner, customer, reservation } = await setup();

    const result = await transitionReservationForOwner(
      owner.id, reservation.id, "REQUESTED", "ACCEPTED", 150_000
    );

    expect(result).toEqual({ updated: true });
    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(after.status).toBe("ACCEPTED");
    expect(after.price).toBe(150_000);
    expect(await customerNotificationTypes(customer.id)).toEqual(["RESERVATION_ACCEPTED"]);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "keeps the original price when the quote is invalid (%s)",
    async (price) => {
      const { owner, reservation } = await setup();
      await transitionReservationForOwner(owner.id, reservation.id, "REQUESTED", "ACCEPTED", price);
      const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      expect(after.price).toBe(100_000);
    }
  );

  it("is a no-op when the reservation isn't in the expected state (double click)", async () => {
    const { owner, customer, reservation } = await setup();
    await transitionReservationForOwner(owner.id, reservation.id, "REQUESTED", "ACCEPTED");

    const second = await transitionReservationForOwner(
      owner.id, reservation.id, "REQUESTED", "REJECTED"
    );

    expect(second).toEqual({ updated: false });
    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(after.status).toBe("ACCEPTED");
    expect(await customerNotificationTypes(customer.id)).toEqual(["RESERVATION_ACCEPTED"]);
  });

  it("can't touch another company's reservation", async () => {
    const { reservation } = await setup();
    const otherOwner = await createUser("COMPANY");
    await prisma.company.create({
      data: { ownerUserId: otherOwner.id, name: "다른업체", status: "ACTIVE" },
    });

    const result = await transitionReservationForOwner(
      otherOwner.id, reservation.id, "REQUESTED", "REJECTED"
    );

    expect(result).toEqual({ updated: false });
    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(after.status).toBe("REQUESTED");
  });

  it("refuses a user who has no company at all", async () => {
    const { customer, reservation } = await setup();
    await expect(
      transitionReservationForOwner(customer.id, reservation.id, "REQUESTED", "ACCEPTED")
    ).rejects.toThrow("등록된 업체가 없습니다.");
  });

  it("completing records completedAt and asks the customer for a review", async () => {
    const { owner, customer, reservation } = await setup();
    await transitionReservationForOwner(owner.id, reservation.id, "REQUESTED", "ACCEPTED");

    await transitionReservationForOwner(owner.id, reservation.id, "ACCEPTED", "COMPLETED");

    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(after.status).toBe("COMPLETED");
    expect(after.completedAt).toBeInstanceOf(Date);
    expect(await customerNotificationTypes(customer.id)).toEqual([
      "RESERVATION_ACCEPTED",
      "RESERVATION_COMPLETED",
      "REVIEW_REQUEST",
    ]);
  });

  it.each([
    ["REJECTED", "RESERVATION_REJECTED"],
    ["NO_SHOW", "RESERVATION_NO_SHOW"],
  ] as const)("marking %s notifies the customer", async (to, type) => {
    const { owner, customer, reservation } = await setup();
    await transitionReservationForOwner(owner.id, reservation.id, "REQUESTED", to);
    expect(await customerNotificationTypes(customer.id)).toEqual([type]);
  });
});
