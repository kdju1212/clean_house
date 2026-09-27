import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  cancelReservationForCustomer,
  createReservationForCustomer,
  type CreateReservationInput,
} from "@/lib/reservation-service";
import { createReservation, createUser, koreaDateStr, resetDb, setupMarketplace } from "@/test/db";

type Marketplace = Awaited<ReturnType<typeof setupMarketplace>>;

function bookingInput(
  m: Marketplace,
  overrides: Partial<CreateReservationInput> = {}
): CreateReservationInput {
  return {
    customerId: m.customer.id,
    customerRegionId: m.dong.id,
    companyId: m.company.id,
    items: [{ categoryId: m.category.id }],
    name: " 홍길동 ",
    phone: "010-1234-5678",
    address: "서울 강남구 테헤란로 1",
    addressDetail: "",
    desiredDateRaw: koreaDateStr(3),
    desiredTime: "10:00",
    requestNote: "",
    agreeToCancellationPolicy: true,
    ...overrides,
  };
}

beforeEach(resetDb);

describe("createReservationForCustomer", () => {
  it("creates a REQUESTED reservation and notifies the company", async () => {
    const m = await setupMarketplace();

    const id = await createReservationForCustomer(bookingInput(m));

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id },
      include: { items: true, chatRoom: true },
    });
    expect(reservation.status).toBe("REQUESTED");
    expect(reservation.customerName).toBe("홍길동");
    expect(reservation.price).toBe(100_000);
    expect(reservation.items).toHaveLength(1);
    expect(reservation.chatRoom).not.toBeNull();

    const notifications = await prisma.notification.findMany({ where: { userId: m.owner.id } });
    expect(notifications.map((n) => n.type)).toEqual(["RESERVATION_REQUESTED"]);
  });

  it.each([undefined, false, "", "off"])(
    "refuses without cancellation-policy consent (%s)",
    async (consent) => {
      const m = await setupMarketplace();
      await expect(
        createReservationForCustomer(bookingInput(m, { agreeToCancellationPolicy: consent }))
      ).rejects.toThrow("취소 정책에 동의해주세요.");
      expect(await prisma.reservation.count()).toBe(0);
    }
  );

  it("accepts the web checkbox's 'on' value as consent", async () => {
    const m = await setupMarketplace();
    await expect(
      createReservationForCustomer(bookingInput(m, { agreeToCancellationPolicy: "on" }))
    ).resolves.toEqual(expect.any(String));
  });

  it("refuses a date that's already past in Korea", async () => {
    const m = await setupMarketplace();
    await expect(
      createReservationForCustomer(bookingInput(m, { desiredDateRaw: koreaDateStr(-1) }))
    ).rejects.toThrow("오늘 이후 날짜를 선택해주세요.");
  });

  it.each([
    ["suspended", { status: "SUSPENDED" as const }],
    ["pending approval", { status: "PENDING" as const }],
    ["paused by the owner", { isAvailable: false }],
  ])("refuses a company that's %s", async (_label, overrides) => {
    const m = await setupMarketplace(overrides);
    await expect(createReservationForCustomer(bookingInput(m))).rejects.toThrow(
      "현재 예약을 받을 수 없는 업체입니다."
    );
  });

  it("refuses a customer outside the company's service area", async () => {
    const m = await setupMarketplace();
    const elsewhere = await prisma.region.create({ data: { name: "부산광역시", level: "SIDO" } });
    await expect(
      createReservationForCustomer(bookingInput(m, { customerRegionId: elsewhere.id }))
    ).rejects.toThrow("해당 업체는 고객님의 지역을 서비스하지 않습니다.");
  });

  it("refuses a service the company doesn't offer", async () => {
    const m = await setupMarketplace();
    const other = await prisma.category.create({ data: { slug: "washer", name: "세탁기청소" } });
    await expect(
      createReservationForCustomer(bookingInput(m, { items: [{ categoryId: other.id }] }))
    ).rejects.toThrow("해당 업체가 제공하지 않는 서비스가 포함돼 있어요.");
  });

  it("refuses a date the company marked as a day off", async () => {
    const m = await setupMarketplace();
    const date = koreaDateStr(3);
    await prisma.companyBlockedDate.create({
      data: { companyId: m.company.id, date: new Date(`${date}T00:00:00.000Z`) },
    });
    await expect(createReservationForCustomer(bookingInput(m))).rejects.toThrow(
      "해당 날짜는 업체 휴무일이에요."
    );
  });

  it("refuses the company's weekly closed day", async () => {
    const weekday = new Date(`${koreaDateStr(3)}T00:00:00.000Z`).getUTCDay();
    const m = await setupMarketplace({ closedWeekdays: [weekday] });
    await expect(createReservationForCustomer(bookingInput(m))).rejects.toThrow(
      "해당 날짜는 업체 휴무일이에요."
    );
  });

  it("refuses a time outside the company's bookable slots", async () => {
    const m = await setupMarketplace({ businessHours: "09:00-18:00" });
    await expect(
      createReservationForCustomer(bookingInput(m, { desiredTime: "20:00" }))
    ).rejects.toThrow("선택하신 시간은 예약할 수 없어요.");
  });

  it("refuses a slot every crew is already booked for", async () => {
    const m = await setupMarketplace();
    await createReservationForCustomer(bookingInput(m));
    await expect(createReservationForCustomer(bookingInput(m))).rejects.toThrow(
      "선택하신 시간은 예약할 수 없어요."
    );
  });

  it("lets a two-crew company take two bookings for the same slot", async () => {
    const m = await setupMarketplace({ crewCount: 2 });
    await createReservationForCustomer(bookingInput(m));
    await createReservationForCustomer(bookingInput(m));
    await expect(createReservationForCustomer(bookingInput(m))).rejects.toThrow(
      "선택하신 시간은 예약할 수 없어요."
    );
  });

  it("frees a slot back up once its booking is cancelled", async () => {
    const m = await setupMarketplace();
    await createReservation({
      customerId: m.customer.id,
      companyId: m.company.id,
      categoryId: m.category.id,
      date: koreaDateStr(3),
      status: "CANCELLED",
    });
    await expect(createReservationForCustomer(bookingInput(m))).resolves.toEqual(
      expect.any(String)
    );
  });
});

describe("cancelReservationForCustomer (당일·전날 취소 불가)", () => {
  async function bookedDaysFromNow(m: Marketplace, days: number) {
    return createReservation({
      customerId: m.customer.id,
      companyId: m.company.id,
      categoryId: m.category.id,
      date: koreaDateStr(days),
      status: "ACCEPTED",
    });
  }

  it.each([0, 1])("refuses to cancel %i day(s) before the visit", async (days) => {
    const m = await setupMarketplace();
    const r = await bookedDaysFromNow(m, days);

    const result = await cancelReservationForCustomer(m.customer.id, r.id);

    expect(result.error).toContain("예약일 하루 전부터는 취소할 수 없어요");
    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: r.id } });
    expect(after.status).toBe("ACCEPTED");
  });

  it("cancels two or more days ahead and notifies the company", async () => {
    const m = await setupMarketplace();
    const r = await bookedDaysFromNow(m, 2);

    expect(await cancelReservationForCustomer(m.customer.id, r.id)).toEqual({});

    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: r.id } });
    expect(after.status).toBe("CANCELLED");
    const notifications = await prisma.notification.findMany({ where: { userId: m.owner.id } });
    expect(notifications.map((n) => n.type)).toEqual(["RESERVATION_CANCELLED"]);
  });

  it("refuses to cancel someone else's reservation", async () => {
    const m = await setupMarketplace();
    const r = await bookedDaysFromNow(m, 5);
    const stranger = await createUser("CUSTOMER");

    expect((await cancelReservationForCustomer(stranger.id, r.id)).error).toBeDefined();
    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: r.id } });
    expect(after.status).toBe("ACCEPTED");
  });

  it.each(["COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW"] as const)(
    "refuses to cancel a %s reservation",
    async (status) => {
      const m = await setupMarketplace();
      const r = await createReservation({
        customerId: m.customer.id,
        companyId: m.company.id,
        categoryId: m.category.id,
        date: koreaDateStr(5),
        status,
      });

      expect((await cancelReservationForCustomer(m.customer.id, r.id)).error).toBeDefined();
      const after = await prisma.reservation.findUniqueOrThrow({ where: { id: r.id } });
      expect(after.status).toBe(status);
    }
  );
});
