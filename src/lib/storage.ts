import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class InvalidImageError extends Error {}

/**
 * Dev-local disk storage. Swap this module's implementation for an
 * S3-compatible client (e.g. Cloudflare R2) before deploying, since
 * container filesystems on most hosts are not persistent.
 */
export async function saveCompanyImage(
  companyId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new InvalidImageError("jpg, png, webp 형식만 업로드할 수 있어요.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new InvalidImageError("파일 크기는 5MB 이하만 가능해요.");
  }

  const dir = path.join(UPLOAD_ROOT, "companies", companyId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${EXT_BY_TYPE[file.type]}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/companies/${companyId}/${filename}`;
}

export async function deleteCompanyImage(url: string): Promise<void> {
  if (!url.startsWith("/uploads/companies/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  await unlink(filePath).catch(() => {});
}
