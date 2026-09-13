import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * If this user's email is listed in ADMIN_EMAILS and they aren't already
 * ADMIN, promotes them and returns the resulting role. Shared by the web
 * session bootstrap (Auth.js jwt callback) and mobile login so both grant
 * admin access the same way, from the same env var.
 */
export async function bootstrapAdminRole(user: {
  id: string;
  email: string | null;
  role: string;
}): Promise<string> {
  if (user.role === "ADMIN" || !user.email) {
    return user.role;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return user.role;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  return "ADMIN";
}
