import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

/** Brings the test database's schema up to date once per run. */
export default function setup(project: TestProject) {
  const url = project.config.env.DATABASE_URL;
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url },
  });
}
