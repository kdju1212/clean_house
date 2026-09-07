import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
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
 * The signature binds the exact Content-Type, so a mismatched upload is
 * rejected by R2 itself.
 */
export async function createPresignedUploadUrl(key: string, contentType: string) {
  const env = getR2Env();
  const client = getClient(env);

  const command = new PutObjectCommand({
    Bucket: env.bucket,
    Key: key,
    ContentType: contentType,
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

/** Extracts the object key from a public R2 URL, or null if it isn't one. */
export function r2KeyFromPublicUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return null;
  const prefix = `${publicUrl.replace(/\/$/, "")}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
