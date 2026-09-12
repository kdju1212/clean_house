import "server-only";
import { v2 as cloudinary } from "cloudinary";

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    // Intentionally generic — never echo which specific var is missing,
    // and never log the values themselves.
    throw new Error(
      "이미지 저장소가 아직 설정되지 않았어요. 잠시 후 다시 시도해주세요."
    );
  }
  return { cloudName, apiKey, apiSecret };
}

let configured = false;
function configure(env: ReturnType<typeof getCloudinaryEnv>) {
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudName,
      api_key: env.apiKey,
      api_secret: env.apiSecret,
      secure: true,
    });
    configured = true;
  }
}

/**
 * Cloudinary reports JPEGs with format "jpg", not "jpeg" — normalize so it
 * lines up with the "image/jpeg" convention the rest of the app (and
 * ALLOWED_IMAGE_TYPES) uses.
 */
function contentTypeFromFormat(format: string): string {
  return `image/${format === "jpg" ? "jpeg" : format}`;
}

/**
 * Returns the signed parameters a browser needs to upload directly to
 * Cloudinary (no CORS setup required on our end — Cloudinary's upload API
 * already allows cross-origin POSTs from any origin). The signature binds
 * the exact public_id and timestamp we generated, so the client can't
 * redirect the upload to a different (e.g. another company's) public_id.
 */
export function createSignedUploadParams(publicId: string): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
} {
  const env = getCloudinaryEnv();
  configure(env);

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, timestamp },
    env.apiSecret
  );

  return { cloudName: env.cloudName, apiKey: env.apiKey, timestamp, signature, publicId };
}

/**
 * Looks up what Cloudinary actually has stored for a public_id — never
 * trust the client's earlier claims about what it uploaded. Returns null
 * if nothing exists there.
 */
export async function getCloudinaryResource(
  publicId: string
): Promise<{ bytes: number; contentType: string; secureUrl: string } | null> {
  const env = getCloudinaryEnv();
  configure(env);
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return {
      bytes: result.bytes ?? 0,
      contentType: contentTypeFromFormat(result.format ?? ""),
      secureUrl: result.secure_url,
    };
  } catch {
    return null;
  }
}

/** Downloads an object's bytes from Cloudinary into memory, for server-side re-processing. */
export async function fetchCloudinaryBuffer(secureUrl: string): Promise<Buffer> {
  const res = await fetch(secureUrl);
  if (!res.ok) {
    throw new Error("원본 이미지를 불러오지 못했어요.");
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Uploads a buffer straight to Cloudinary using our own server-side
 * credentials — for the processed (WebP) output the browser never gets to
 * touch directly.
 */
export async function uploadBufferToCloudinary(
  publicId: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const env = getCloudinaryEnv();
  configure(env);
  const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
  await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    resource_type: "image",
    overwrite: true,
  });
}

export async function deleteCloudinaryObject(publicId: string): Promise<void> {
  const env = getCloudinaryEnv();
  configure(env);
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

/** The cloud name isn't secret — it's already embedded in every public
 * delivery URL — so callers can read it without generating a signature. */
export function getCloudinaryCloudName(): string {
  return getCloudinaryEnv().cloudName;
}

/** Cloudinary's delivery domain is fixed regardless of cloud name (the
 * cloud name lives in the URL path, not the host), so this needs no env
 * lookup and no build-time dependency the way the R2 public URL did. */
export function cloudinaryDeliveryUrl(cloudName: string, publicId: string, format: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.${format}`;
}

/** Extracts the public_id from a delivery URL we generated, or null if it isn't one. */
export function cloudinaryPublicIdFromUrl(url: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;
  const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length);
  const dot = rest.lastIndexOf(".");
  if (dot === -1) return null;
  return rest.slice(0, dot);
}
