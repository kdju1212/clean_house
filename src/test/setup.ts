import { vi } from "vitest";

// Services take the caller's userId directly and never read a session, but
// some import files that pull in next-auth, which can't load outside Next.
vi.mock("@/lib/auth", () => ({ auth: async () => null }));
