import "server-only";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { bootstrapAdminRole } from "@/lib/admin-bootstrap";
import { isTestLoginRole, upsertTestUser, verifyTestLoginSecret } from "@/lib/test-login";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    Kakao,
    Naver,
    // Internal-only QA login (no real OAuth account needed) — inert unless
    // TEST_LOGIN_SECRET is set; see src/lib/test-login.ts.
    Credentials({
      id: "test-login",
      name: "Test Login",
      credentials: {
        secret: { label: "Secret", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const secret = typeof credentials?.secret === "string" ? credentials.secret : null;
        const role = credentials?.role;
        if (!verifyTestLoginSecret(secret) || !isTestLoginRole(role)) {
          return null;
        }
        const user = await upsertTestUser(role);
        return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = await bootstrapAdminRole({
          id: user.id ?? "",
          email: user.email ?? null,
          role: user.role,
        });

        token.id = user.id;
        token.role = role;
        token.phone = user.phone ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CUSTOMER" | "COMPANY" | "ADMIN";
        session.user.phone = token.phone as string | null;
      }
      return session;
    },
  },
});
