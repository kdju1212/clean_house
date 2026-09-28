import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getSupportChatMessages,
  listSupportRoomsForAdmin,
  sendSupportMessage,
} from "@/lib/support-chat";
import { createUser, resetDb } from "@/test/db";

beforeEach(resetDb);

describe("sendSupportMessage / getSupportChatMessages", () => {
  it("lets a user send to their own room and see it back", async () => {
    const customer = await createUser("CUSTOMER");

    const sent = await sendSupportMessage(customer.id, customer.id, "환불 문의드려요");
    expect("error" in sent).toBe(false);

    const messages = await getSupportChatMessages(customer.id, customer.id);
    expect("error" in messages).toBe(false);
    if (!("error" in messages)) {
      expect(messages.messages).toHaveLength(1);
      expect(messages.messages[0].content).toBe("환불 문의드려요");
    }
  });

  it("notifies every admin on the user's first message", async () => {
    const customer = await createUser("CUSTOMER");
    const admin1 = await createUser("ADMIN");
    const admin2 = await createUser("ADMIN");

    await sendSupportMessage(customer.id, customer.id, "도와주세요");

    const notified1 = await prisma.notification.count({ where: { userId: admin1.id } });
    const notified2 = await prisma.notification.count({ where: { userId: admin2.id } });
    expect(notified1).toBe(1);
    expect(notified2).toBe(1);
  });

  it("lets an admin read and reply, notifying only the asking user", async () => {
    const customer = await createUser("CUSTOMER");
    const admin = await createUser("ADMIN");
    await sendSupportMessage(customer.id, customer.id, "질문 있어요");

    const reply = await sendSupportMessage(customer.id, admin.id, "안녕하세요, 확인해볼게요");
    expect("error" in reply).toBe(false);

    const asCustomer = await getSupportChatMessages(customer.id, customer.id);
    if (!("error" in asCustomer)) {
      expect(asCustomer.messages.map((m) => m.senderId)).toEqual([customer.id, admin.id]);
    }
    expect(await prisma.notification.count({ where: { userId: customer.id } })).toBe(1);
  });

  it("refuses a stranger who is neither the room's user nor an admin", async () => {
    const customer = await createUser("CUSTOMER");
    const stranger = await createUser("CUSTOMER");

    const result = await sendSupportMessage(customer.id, stranger.id, "몰래 보기");
    expect("error" in result).toBe(true);

    const asOwner = await getSupportChatMessages(customer.id, stranger.id);
    expect("error" in asOwner).toBe(true);
  });

  it("rejects an empty or overly long message", async () => {
    const customer = await createUser("CUSTOMER");
    expect((await sendSupportMessage(customer.id, customer.id, "   ")) as { error?: string }).toHaveProperty(
      "error"
    );
    expect(
      (await sendSupportMessage(customer.id, customer.id, "a".repeat(1001))) as { error?: string }
    ).toHaveProperty("error");
  });
});

describe("listSupportRoomsForAdmin", () => {
  it("lists rooms with the latest message and unread count from the user's side", async () => {
    const customer = await createUser("CUSTOMER");
    const admin = await createUser("ADMIN");
    await sendSupportMessage(customer.id, customer.id, "첫 메시지");
    await sendSupportMessage(customer.id, customer.id, "두번째 메시지");

    const rooms = await listSupportRoomsForAdmin();

    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({
      userId: customer.id,
      lastMessage: "두번째 메시지",
      unreadCount: 2,
    });

    // Admin opening the thread marks the user's messages read.
    await getSupportChatMessages(customer.id, admin.id);
    const after = await listSupportRoomsForAdmin();
    expect(after[0].unreadCount).toBe(0);
  });
});
