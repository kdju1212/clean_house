import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Deletes a company image previously stored on local disk (the storage
 * mechanism used before R2 was wired up — see src/lib/r2.ts for current
 * uploads). Kept only so photos uploaded before the R2 migration can still
 * be cleaned up; new uploads never write here.
 */
export async function deleteLocalCompanyImage(url: string): Promise<void> {
  if (!url.startsWith("/uploads/companies/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  await unlink(filePath).catch(() => {});
}
