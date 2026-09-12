"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
import { assertValidImageMeta, assertValidUploadedImage } from "@/lib/image";
import { processImageToWebp } from "@/lib/image-process";
import { requireSession, requireOwnedCompany } from "@/lib/company-auth";
import { toActionError, type ActionState } from "@/lib/action-state";

const MAX_NAME_LENGTH = 60;
const MAX_PHONE_LENGTH = 30;
const MAX_INTRO_LENGTH = 1000;
const MAX_BUSINESS_HOURS_LENGTH = 100;
const MAX_SERVICE_DESCRIPTION_LENGTH = 200;
const MAX_SERVICE_PRICE = 10_000_000;

export async function createCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();

    const existing = await prisma.company.findUnique({
      where: { ownerUserId: session.user.id },
    });

    if (!existing) {
      const name = formData.get("name");
      const phone = formData.get("phone");
      const introText = formData.get("introText");
      const businessHours = formData.get("businessHours");

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

      await prisma.$transaction([
        prisma.company.create({
          data: {
            ownerUserId: session.user.id,
            name: name.trim(),
            phone: phone.trim(),
            introText: typeof introText === "string" ? introText.trim() : null,
            businessHours:
              typeof businessHours === "string" ? businessHours.trim() : null,
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { role: "COMPANY" },
        }),
      ]);
    }
  } catch (err) {
    return toActionError(err);
  }

  redirect("/company");
}

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const company = await requireOwnedCompany(session.user.id);

    const name = formData.get("name");
    const phone = formData.get("phone");
    const introText = formData.get("introText");
    const businessHours = formData.get("businessHours");
    const isAvailable = formData.get("isAvailable") === "on";

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
        businessHours:
          typeof businessHours === "string" ? businessHours.trim() : null,
        isAvailable,
      },
    });

    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

export async function addService(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const company = await requireOwnedCompany(session.user.id);

    const categoryId = formData.get("categoryId");
    const priceRaw = formData.get("price");
    const description = formData.get("description");

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

    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteService(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string") return;

  await prisma.companyService.deleteMany({
    where: { id: serviceId, companyId: company.id },
  });

  revalidatePath("/company");
}

export async function setRegions(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const regionIds = formData.getAll("regionIds").filter(
    (v): v is string => typeof v === "string"
  );

  await prisma.$transaction([
    prisma.companyRegion.deleteMany({ where: { companyId: company.id } }),
    prisma.companyRegion.createMany({
      data: regionIds.map((regionId) => ({ companyId: company.id, regionId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/company");
}

type PhotoType = "MAIN" | "WORK" | "BEFORE_AFTER";

function normalizePhotoType(value: unknown): PhotoType {
  return value === "MAIN" || value === "BEFORE_AFTER" ? value : "WORK";
}

/**
 * Step 1 of the direct-to-Cloudinary upload flow: verify the caller owns a
 * company and the declared file meta is acceptable, then hand back signed
 * upload parameters. The browser uploads the file straight to Cloudinary
 * with these — the file itself never passes through our server.
 *
 * Called directly from a Client Component (not a <form action>), but the
 * same production redaction applies to thrown errors from any Server
 * Function — so this also returns an error string instead of throwing.
 */
export async function requestPhotoUploadUrl(input: {
  contentType: string;
  size: number;
}): Promise<
  | { error: string }
  | { cloudName: string; apiKey: string; timestamp: number; signature: string; publicId: string }
> {
  try {
    const session = await requireSession();
    const company = await requireOwnedCompany(session.user.id);

    assertValidImageMeta(input.contentType, input.size);

    const publicId = `companies/${company.id}/${randomUUID()}`;
    return createSignedUploadParams(publicId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

/**
 * Step 2: called by the client after the Cloudinary upload succeeds, to
 * record the photo in the DB. Re-validates that the public_id actually
 * belongs to the caller's own company before trusting it, then re-checks
 * the actually stored original (never the client's earlier claims) — an
 * object that fails this check is deleted immediately instead of being
 * left behind as an orphan.
 *
 * The verified original is never kept: it's re-encoded server-side into
 * a resized WebP (see processImageToWebp) and only the WebP is what
 * actually gets persisted — the original upload is always deleted once
 * we're done with it, success or failure, so Cloudinary never accumulates
 * both an original and a processed copy.
 */
export async function confirmPhotoUpload(input: {
  publicId: string;
  type?: string;
}): Promise<{ error: string } | { ok: true }> {
  try {
    const session = await requireSession();
    const company = await requireOwnedCompany(session.user.id);

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
      // Verify what actually landed in Cloudinary, not just what we sent.
      const finalResource = await getCloudinaryResource(finalPublicId);
      assertValidUploadedImage(
        finalResource
          ? { contentLength: finalResource.bytes, contentType: finalResource.contentType }
          : null
      );
    } catch {
      await deleteCloudinaryObject(finalPublicId).catch(() => {});
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

    revalidatePath("/company");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

export async function deletePhoto(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const photoId = formData.get("photoId");
  if (typeof photoId !== "string") return;

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

  revalidatePath("/company");
}
