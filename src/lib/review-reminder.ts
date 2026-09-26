import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notification";

const DAY_MS = 24 * 60 * 60 * 1000;
// Wait a day after completion before nudging; stop trying after a week so
// a job that was down for a while doesn't wake up and nag stale customers.
const REMIND_AFTER_MS = DAY_MS;
const GIVE_UP_AFTER_MS = 7 * DAY_MS;

/**
 * The immediate "리뷰를 남겨주세요" notification goes out when the company
 * marks a reservation COMPLETED (company-reservation-service.ts); this is
 * the single follow-up for customers who still haven't written one.
 * Idempotent — each reservation is claimed (reviewReminderSentAt set)
 * before its notification is sent, so overlapping or repeated runs never
 * double-send.
 */
export async function sendDueReviewReminders(): Promise<{ sent: number }> {
  const now = Date.now();
  const due = await prisma.reservation.findMany({
    where: {
      status: "COMPLETED",
      review: { is: null },
      reviewReminderSentAt: null,
      completedAt: {
        lte: new Date(now - REMIND_AFTER_MS),
        gte: new Date(now - GIVE_UP_AFTER_MS),
      },
    },
    select: { id: true, customerId: true, company: { select: { name: true } } },
    take: 500,
  });

  let sent = 0;
  for (const reservation of due) {
    const claimed = await prisma.reservation.updateMany({
      where: { id: reservation.id, reviewReminderSentAt: null },
      data: { reviewReminderSentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    await createNotification({
      userId: reservation.customerId,
      type: "REVIEW_REQUEST",
      title: "리뷰를 기다리고 있어요",
      body: `${reservation.company.name} 청소는 만족스러우셨나요? 짧은 리뷰가 다른 고객에게 큰 도움이 돼요.`,
      link: `/reservations/${reservation.id}/review`,
    });
    sent++;
  }

  return { sent };
}
