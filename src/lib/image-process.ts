import "server-only";
import sharp from "sharp";

export const WEBP_QUALITY = 82;
export const MAX_IMAGE_WIDTH = 1600;

/**
 * Re-encodes an uploaded photo (JPEG/PNG/WebP) into a resized WebP so R2
 * never has to store an untouched original: auto-orients using the EXIF
 * orientation tag (sharp's rotate() with no args reads it, applies it,
 * then strips it so the stored file is never re-rotated by a viewer),
 * caps the width at MAX_IMAGE_WIDTH while preserving aspect ratio
 * (withoutEnlargement means a smaller original is never scaled up), and
 * encodes at WEBP_QUALITY. sharp's default pixel-count ceiling stays
 * enabled, so a pathological "decompression bomb" image still gets
 * rejected before it can blow up server memory.
 *
 * Width-only, not also capping height to the same box (fit: "inside" on a
 * width+height box scales down whichever dimension is more constrained) —
 * company detail photos are deliberately tall (a long infographic-style
 * image, or one split into several tall pieces meant to tile together), and
 * capping height too was shrinking their width far below what's needed to
 * look sharp at the width they're actually displayed at, since fit:"inside"
 * scales both dimensions down together to fit a 1600x1600 box.
 */
export async function processImageToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
