import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createReviewForUser, replyToReviewForOwner } from "@/lib/review-service";
import { createReservation, createUser, koreaDateStr, resetDb, setupMarketplace } from "@/test/db";
import type { ReservationStatus } from "@/generated/prisma/client";

beforeEach(resetDb);

async function setup(status: ReservationStatus = "COMPLETED") {
  const m = await setupMarketplace();
  const reservation = await createReservation({
    customerId: m.customer.id,
    companyId: m.company.id,
    categoryId: m.category.id,
    date: koreaDateStr(-3),
    status,
  });
  return { ...m, reservation };
}

describe("createReviewForUser", () => {
  it("lets the customer review a completed visit", async () => {
    const { customer, company, reservation } = await setup();

    await createReviewForUser(customer.id, {
      reservationId: reservation.id,
      rating: 5,
      content: "  꼼꼼하게 잘 해주셨어요  ",
    });

    const review = await prisma.review.findUniqueOrThrow({
      where: { reservationId: reservation.id },
    });
    expect(review).toMatchObject({ companyId: company.id, rating: 5, content: "꼼꼼하게 잘 해주셨어요" });
  });

  it("allows only one review per reservation", async () => {
    const { customer, reservation } = await setup();
    const input = { reservationId: reservation.id, rating: 4, content: "좋아요" };
    await createReviewForUser(customer.id, input);
    await expect(createReviewForUser(customer.id, input)).rejects.toThrow(
      "리뷰를 작성할 수 없는 예약이에요."
    );
  });

  it.each(["REQUESTED", "ACCEPTED", "CANCELLED", "REJECTED", "NO_SHOW"] as const)(
    "refuses a %s reservation",
    async (status) => {
      const { customer, reservation } = await setup(status);
      await expect(
        createReviewForUser(customer.id, { reservationId: reservation.id, rating: 5, content: "굿" })
      ).rejects.toThrow("리뷰를 작성할 수 없는 예약이에요.");
    }
  );

  it("refuses someone who isn't the reservation's customer", async () => {
    const { reservation } = await setup();
    const stranger = await createUser("CUSTOMER");
    await expect(
      createReviewForUser(stranger.id, { reservationId: reservation.id, rating: 1, content: "별로" })
    ).rejects.toThrow("리뷰를 작성할 수 없는 예약이에요.");
  });

  it.each([0, 6, 3.5])("rejects rating %s", async (rating) => {
    const { customer, reservation } = await setup();
    await expect(
      createReviewForUser(customer.id, { reservationId: reservation.id, rating, content: "내용" })
    ).rejects.toThrow("평점을 선택해주세요.");
  });

  it("rejects an empty review", async () => {
    const { customer, reservation } = await setup();
    await expect(
      createReviewForUser(customer.id, { reservationId: reservation.id, rating: 5, content: "   " })
    ).rejects.toThrow("리뷰 내용을 입력해주세요.");
  });
});

describe("replyToReviewForOwner", () => {
  async function reviewed() {
    const s = await setup();
    await createReviewForUser(s.customer.id, {
      reservationId: s.reservation.id,
      rating: 5,
      content: "좋아요",
    });
    const review = await prisma.review.findUniqueOrThrow({
      where: { reservationId: s.reservation.id },
    });
    return { ...s, review };
  }

  it("saves the reply and notifies the customer only the first time", async () => {
    const { owner, customer, review } = await reviewed();

    expect(await replyToReviewForOwner(owner.id, review.id, " 감사합니다! ")).toEqual({});
    expect(await replyToReviewForOwner(owner.id, review.id, "다시 한번 감사드려요")).toEqual({});

    const after = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    expect(after.ownerReply).toBe("다시 한번 감사드려요");
    const notified = await prisma.notification.count({
      where: { userId: customer.id, type: "REVIEW_REPLY" },
    });
    expect(notified).toBe(1);
  });

  it("refuses another company's owner", async () => {
    const { review } = await reviewed();
    const otherOwner = await createUser("COMPANY");
    expect((await replyToReviewForOwner(otherOwner.id, review.id, "끼어들기")).error).toBeDefined();
    const after = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    expect(after.ownerReply).toBeNull();
  });
});
