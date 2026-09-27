import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests wipe every table between cases, so they must never be pointed at a
// real database — only one whose name ends in "_test" is accepted.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://clean_house:clean_house@localhost:5432/clean_house_test";
if (!/_test$/.test(new URL(testDatabaseUrl).pathname)) {
  throw new Error(`TEST_DATABASE_URL must name a *_test database, got: ${testDatabaseUrl}`);
}

// Production (Vercel) runs in UTC — match it so date math behaves the same.
process.env.TZ = "UTC";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The real "server-only" throws outside a React Server Components build.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["src/test/global-setup.ts"],
    setupFiles: ["src/test/setup.ts"],
    // DB tests share one database and reset it per test, so files can't
    // run concurrently.
    fileParallelism: false,
    env: {
      TZ: "UTC",
      DATABASE_URL: testDatabaseUrl,
      DIRECT_DATABASE_URL: testDatabaseUrl,
    },
  },
});
