import "server-only";
import sharp from "sharp";

export const WEBP_QUALITY = 82;
export const MAX_IMAGE_DIMENSION = 1600;

/**
 * Re-encodes an uploaded photo (JPEG/PNG/WebP) into a resized WebP so R2
 * never has to store an untouched original: auto-orients using the EXIF
 * orientation tag (sharp's rotate() with no args reads it, applies it,
 * then strips it so the stored file is never re-rotated by a viewer),
 * caps the long edge at MAX_IMAGE_DIMENSION while preserving aspect ratio
 * (withoutEnlargement means a smaller original is never scaled up), and
 * encodes at WEBP_QUALITY. sharp's default pixel-count ceiling stays
 * enabled, so a pathological "decompression bomb" image still gets
 * rejected before it can blow up server memory.
 */
export async function processImageToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
