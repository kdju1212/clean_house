import "server-only";
import sharp from "sharp";

export const WEBP_QUALITY = 82;
export const MAX_IMAGE_WIDTH = 1600;
// WebP's own encoder refuses anything over 16383px on a side (14-bit
// dimension field) — "Processed image is too large for the WebP format".
// This height ceiling exists purely as a safety net for that hard limit,
// with margin to spare; it's far above anything a normal (or even a long
// stacked-pieces) detail photo needs, so it never binds in practice.
export const MAX_IMAGE_HEIGHT = 15000;

/**
 * Re-encodes an uploaded photo (JPEG/PNG/WebP) into a resized WebP so R2
 * never has to store an untouched original: auto-orients using the EXIF
 * orientation tag (sharp's rotate() with no args reads it, applies it,
 * then strips it so the stored file is never re-rotated by a viewer),
 * caps width/height (withoutEnlargement means a smaller original is never
 * scaled up), and encodes at WEBP_QUALITY. sharp's default pixel-count
 * ceiling stays enabled, so a pathological "decompression bomb" image
 * still gets rejected before it can blow up server memory.
 *
 * fit: "inside" against a 1600x15000 box, not a 1600x1600 square — a
 * company detail photo is deliberately allowed to be tall (a long
 * infographic-style image, or one split into pieces meant to tile
 * together), and capping height to the same 1600 as width was shrinking
 * the width far below what's needed to look sharp at the width it's
 * actually displayed at. MAX_IMAGE_HEIGHT only kicks in for something
 * taller than 15000px, which is what WebP itself can't encode anyway.
 */
export async function processImageToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: MAX_IMAGE_WIDTH,
      height: MAX_IMAGE_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
