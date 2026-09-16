import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireOwnedCompany } from "@/lib/company-auth";
import { deleteLocalCompanyImage } from "@/lib/storage";
import {
  cloudinaryDeliveryUrl,
  cloudinaryPublicIdFromUrl,
  createSignedUploadParams,
  deleteCloudinaryObject,
  fetchCloudinaryBuffer,
  getCloudinaryCloudName,
  getCloudinaryResource,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary";
import {
  assertValidImageMeta,
  assertValidUploadedImage,
  InvalidImageError,
  MAX_PROCESSED_IMAGE_SIZE_BYTES,
} from "@/lib/image";
import { processImageToWebp } from "@/lib/image-process";

const MAX_NAME_LENGTH = 60;
const MAX_PHONE_LENGTH = 30;
const MAX_INTRO_LENGTH = 1000;
const MAX_BUSINESS_HOURS_LENGTH = 100;
const MAX_SERVICE_DESCRIPTION_LENGTH = 200;
const MAX_SERVICE_PRICE = 10_000_000;

/**
 * Everything below is shared by the web's company Server Actions
 * (src/app/company/actions.ts) and the mobile company-profile API — same
 * field validation, same "re-derive the caller's company from their own
 * userId" ownership check, same Cloudinary verify/re-encode pipeline for
 * photos. Company *registration* (createCompany) stays web-only for now —
 * this file only covers editing an existing company's profile.
 */

export async function updateCompanyProfileForOwner(
  ownerUserId: string,
  input: {
    name: unknown;
    phone: unknown;
    introText: unknown;
    businessHours: unknown;
    isAvailable: boolean;
  }
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  const { name, phone, introText, businessHours, isAvailable } = input;

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("업체명을 입력해주세요.");
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`업체명은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.`);
  }
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new Error("연락처를 입력해주세요.");
  }
  if (phone.trim().length > MAX_PHONE_LENGTH) {
    throw new Error("연락처가 너무 길어요.");
  }
  if (typeof introText === "string" && introText.trim().length > MAX_INTRO_LENGTH) {
    throw new Error(`업체 소개는 ${MAX_INTRO_LENGTH}자 이하로 입력해주세요.`);
  }
  if (
    typeof businessHours === "string" &&
    businessHours.trim().length > MAX_BUSINESS_HOURS_LENGTH
  ) {
    throw new Error("영업시간이 너무 길어요.");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      introText: typeof introText === "string" ? introText.trim() : null,
      businessHours: typeof businessHours === "string" ? businessHours.trim() : null,
      isAvailable,
    },
  });
}

export async function addServiceForOwner(
  ownerUserId: string,
  input: { categoryId: unknown; price: unknown; description: unknown }
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  const { categoryId, price: priceRaw, description } = input;

  if (typeof categoryId !== "string" || categoryId.length === 0) {
    throw new Error("청소 종류를 선택해주세요.");
  }
  const price = Number(priceRaw);
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error("가격을 올바르게 입력해주세요.");
  }
  if (price > MAX_SERVICE_PRICE) {
    throw new Error("가격이 너무 높아요.");
  }
  if (
    typeof description === "string" &&
    description.trim().length > MAX_SERVICE_DESCRIPTION_LENGTH
  ) {
    throw new Error(`설명은 ${MAX_SERVICE_DESCRIPTION_LENGTH}자 이하로 입력해주세요.`);
  }

  await prisma.companyService.upsert({
    where: { companyId_categoryId: { companyId: company.id, categoryId } },
    update: {
      price,
      description: typeof description === "string" ? description.trim() : null,
    },
    create: {
      companyId: company.id,
      categoryId,
      price,
      description: typeof description === "string" ? description.trim() : null,
    },
  });
}

export async function deleteServiceForOwner(
  ownerUserId: string,
  serviceId: string
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);
  await prisma.companyService.deleteMany({
    where: { id: serviceId, companyId: company.id },
  });
}

export async function setRegionsForOwner(
  ownerUserId: string,
  regionIds: string[]
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  await prisma.$transaction([
    prisma.companyRegion.deleteMany({ where: { companyId: company.id } }),
    prisma.companyRegion.createMany({
      data: regionIds.map((regionId) => ({ companyId: company.id, regionId })),
      skipDuplicates: true,
    }),
  ]);
}

type PhotoType = "MAIN" | "WORK" | "BEFORE_AFTER";

function normalizePhotoType(value: unknown): PhotoType {
  return value === "MAIN" || value === "BEFORE_AFTER" ? value : "WORK";
}

/** Step 1 of the direct-to-Cloudinary upload flow — see confirmPhotoUploadForOwner
 * for step 2. The file itself never passes through our server either way. */
export async function requestPhotoUploadUrlForOwner(
  ownerUserId: string,
  input: { contentType: string; size: number }
) {
  const company = await requireOwnedCompany(ownerUserId);

  assertValidImageMeta(input.contentType, input.size);

  const publicId = `companies/${company.id}/${randomUUID()}`;
  return createSignedUploadParams(publicId);
}

/**
 * Step 2: re-validates that the public_id actually belongs to the caller's
 * own company, re-checks what was actually stored in Cloudinary (never the
 * client's earlier claims — an object that fails this is deleted
 * immediately), then re-encodes into a resized WebP server-side. The
 * verified original is always deleted once we're done with it, whether the
 * re-encode succeeds or not, so Cloudinary never keeps both copies.
 */
export async function confirmPhotoUploadForOwner(
  ownerUserId: string,
  input: { publicId: string; type?: string }
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  if (!input.publicId.startsWith(`companies/${company.id}/`)) {
    throw new Error("잘못된 업로드 정보입니다.");
  }

  let original: { secureUrl: string };
  try {
    const resource = await getCloudinaryResource(input.publicId);
    assertValidUploadedImage(
      resource ? { contentLength: resource.bytes, contentType: resource.contentType } : null
    );
    original = resource!;
  } catch (err) {
    await deleteCloudinaryObject(input.publicId).catch(() => {});
    throw err;
  }

  const finalPublicId = `companies/${company.id}/${randomUUID()}`;
  try {
    const buffer = await fetchCloudinaryBuffer(original.secureUrl);
    const webp = await processImageToWebp(buffer);
    await uploadBufferToCloudinary(finalPublicId, webp, "image/webp");
    const finalResource = await getCloudinaryResource(finalPublicId);
    // The re-encoded WebP gets its own, more generous size ceiling than the
    // raw upload check above — these photos are deliberately allowed to be
    // very tall, so a legitimately large re-encode shouldn't be treated the
    // same as a suspicious oversized input.
    assertValidUploadedImage(
      finalResource
        ? { contentLength: finalResource.bytes, contentType: finalResource.contentType }
        : null,
      MAX_PROCESSED_IMAGE_SIZE_BYTES
    );
  } catch (err) {
    await deleteCloudinaryObject(finalPublicId).catch(() => {});
    // A known, user-actionable reason (too big even after re-encoding, bad
    // format) is worth showing as-is; anything else (a transient sharp/
    // network failure) falls back to the generic message.
    if (err instanceof InvalidImageError) {
      throw err;
    }
    console.error("Photo re-encode failed:", err);
    throw new Error("이미지 처리에 실패했어요. 다른 사진으로 다시 시도해주세요.");
  } finally {
    await deleteCloudinaryObject(input.publicId).catch(() => {});
  }

  const url = cloudinaryDeliveryUrl(getCloudinaryCloudName(), finalPublicId, "webp");
  const photoType = normalizePhotoType(input.type);

  await prisma.companyPhoto.create({
    data: { companyId: company.id, url, type: photoType },
  });

  if (photoType === "MAIN") {
    await prisma.company.update({
      where: { id: company.id },
      data: { mainImageUrl: url },
    });
  }
}

export async function deletePhotoForOwner(
  ownerUserId: string,
  photoId: string
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  const photo = await prisma.companyPhoto.findFirst({
    where: { id: photoId, companyId: company.id },
  });
  if (!photo) return;

  await prisma.companyPhoto.delete({ where: { id: photo.id } });

  const publicId = cloudinaryPublicIdFromUrl(photo.url);
  if (publicId) {
    await deleteCloudinaryObject(publicId).catch(() => {});
  } else {
    await deleteLocalCompanyImage(photo.url);
  }

  if (company.mainImageUrl === photo.url) {
    await prisma.company.update({
      where: { id: company.id },
      data: { mainImageUrl: null },
    });
  }
}
