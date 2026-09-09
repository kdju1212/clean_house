import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    // Intentionally generic — never echo which specific var is missing,
    // and never log the values themselves.
    throw new Error(
      "이미지 저장소가 아직 설정되지 않았어요. 잠시 후 다시 시도해주세요."
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let cachedClient: S3Client | null = null;

function getClient(env: ReturnType<typeof getR2Env>) {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
  }
  return cachedClient;
}

/**
 * Returns a short-lived presigned PUT URL the browser can upload directly
 * to, plus the public URL the object will be reachable at once uploaded.
 * The signature binds the exact Content-Type, and — when contentLength is
 * given — the exact Content-Length too, so the client can't stream a body
 * bigger than what it declared: browsers set Content-Length automatically
 * from the Blob/File being uploaded, so a mismatched byte count (whether
 * from a lie or a truncated/oversized upload) fails the PUT at R2 itself
 * rather than silently landing an oversized object in storage.
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  contentLength?: number
) {
  const env = getR2Env();
  const client = getClient(env);

  const command = new PutObjectCommand({
    Bucket: env.bucket,
    Key: key,
    ContentType: contentType,
    ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 5 * 60 });
  const publicUrl = `${env.publicUrl.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, publicUrl };
}

export async function deleteR2Object(key: string) {
  const env = getR2Env();
  const client = getClient(env);
  await client.send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key }));
}

/**
 * Reads back the actual stored object's size/type straight from R2, so the
 * confirm step can verify what was really uploaded instead of trusting the
 * client's earlier declared values. Returns null if the object doesn't
 * exist (e.g. confirm called without ever uploading, or a wrong key).
 */
export async function headR2Object(
  key: string
): Promise<{ contentLength: number; contentType: string } | null> {
  const env = getR2Env();
  const client = getClient(env);
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: env.bucket, Key: key })
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? "",
    };
  } catch {
    return null;
  }
}

/** Extracts the object key from a public R2 URL, or null if it isn't one. */
export function r2KeyFromPublicUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return null;
  const prefix = `${publicUrl.replace(/\/$/, "")}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
