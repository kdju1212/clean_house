import "server-only";
import { prisma } from "@/lib/prisma";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

/**
 * Fires an Expo push notification to whatever device token the user last
 * registered from the mobile app. Called from the same places that already
 * create an in-app Notification row (see createNotification/
 * notifyNewChatMessage below) so every existing call site gets push for
 * free, with no changes needed at each one.
 *
 * Never throws — a push failure (no token, device uninstalled the app,
 * Expo's service being down) must never break the reservation/chat/review
 * flow that triggered it. Failures are only logged.
 */
export async function sendPushNotification(
  userId: string,
  input: { title: string; body?: string; link?: string }
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    const token = user?.pushToken;
    if (!token) return;

    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title: input.title,
        body: input.body,
        data: input.link ? { link: input.link } : undefined,
        sound: "default",
      }),
    });

    const json = await res.json().catch(() => null);
    const ticket = json?.data;
    // A token Expo no longer recognizes (app uninstalled, token rotated on
    // the device) is worth clearing so future sends don't keep hitting it.
    if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
      await prisma.user.update({ where: { id: userId }, data: { pushToken: null } });
    }
  } catch (err) {
    console.error("Push notification failed:", err);
  }
}
