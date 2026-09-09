export class InvalidImageError extends Error {}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function assertValidImageMeta(contentType: string, size: number) {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new InvalidImageError("jpg, png, webp 형식만 업로드할 수 있어요.");
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new InvalidImageError("파일 크기를 확인할 수 없어요.");
  }
  if (size > MAX_IMAGE_SIZE_BYTES) {
    throw new InvalidImageError("파일 크기는 5MB 이하만 가능해요.");
  }
}

/**
 * Re-checks the actually-stored object (read back from R2 via a HEAD
 * request) at confirm time — the earlier assertValidImageMeta only ever
 * saw values the client claimed before uploading, which a direct API call
 * could lie about.
 */
export function assertValidUploadedImage(
  meta: { contentLength: number; contentType: string } | null
) {
  if (!meta) {
    throw new InvalidImageError("업로드된 파일을 찾을 수 없어요. 다시 시도해주세요.");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(meta.contentType)) {
    throw new InvalidImageError("jpg, png, webp 형식만 업로드할 수 있어요.");
  }
  if (meta.contentLength <= 0 || meta.contentLength > MAX_IMAGE_SIZE_BYTES) {
    throw new InvalidImageError("파일 크기는 5MB 이하만 가능해요.");
  }
}
