import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwnedCompany } from "@/lib/company-auth";
import { getReservationQuestions, supportsPerUnitPricing } from "@/lib/reservation-questions";
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
const MAX_WEBSITE_URL_LENGTH = 300;
const MAX_REPRESENTATIVE_NAME_LENGTH = 30;

/** Accepts "example.com" as well as "https://example.com" — a company
 * owner typing their own address by hand shouldn't have to remember the
 * protocol prefix. Rejects anything that still isn't a valid http(s) URL
 * after that (so this can't be used to store a "tel:"/"javascript:" etc.
 * value that later gets rendered as a link). */
function normalizeWebsiteUrl(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("올바른 홈페이지 주소를 입력해주세요.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("올바른 홈페이지 주소를 입력해주세요.");
  }
  return parsed.toString();
}

/**
 * Everything below is shared by the web's company Server Actions
 * (src/app/company/actions.ts) and the mobile company-profile API — same
 * field validation, same "re-derive the caller's company from their own
 * userId" ownership check, same Cloudinary verify/re-encode pipeline for
 * photos.
 */

/**
 * Silently no-ops (no error) when the caller already owns a company — both
 * callers (the web register-form's Server Action and the mobile /company/
 * register screen) route away from their registration form entirely once
 * one exists, so reaching here with an existing company only happens on a
 * double-submit, which should just behave like the first submit already
 * succeeded.
 */
export async function createCompanyForOwner(
  ownerUserId: string,
  input: {
    name: unknown;
    phone: unknown;
    introText: unknown;
    businessHours: unknown;
    businessRegistrationNumber: unknown;
    representativeName: unknown;
  }
): Promise<void> {
  const existing = await prisma.company.findUnique({ where: { ownerUserId } });
  if (existing) return;

  const { name, phone, introText, businessHours, businessRegistrationNumber: businessRegistrationNumberRaw, representativeName } =
    input;

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
  if (
    typeof representativeName === "string" &&
    representativeName.trim().length > MAX_REPRESENTATIVE_NAME_LENGTH
  ) {
    throw new Error(`대표자명은 ${MAX_REPRESENTATIVE_NAME_LENGTH}자 이하로 입력해주세요.`);
  }

  // Optional — a company can register without it, but skips both the
  // "사업자등록" self-declared badge and eligibility for admin
  // verification until they add one. Only digits are meaningful
  // (사업자등록번호는 항상 10자리) — stripping dashes here means
  // "123-45-67890" and "1234567890" are recognized as the same number
  // for both validation and the @unique constraint.
  const businessRegistrationNumberInput =
    typeof businessRegistrationNumberRaw === "string" ? businessRegistrationNumberRaw.trim() : "";
  let businessRegistrationNumber: string | null = null;
  if (businessRegistrationNumberInput.length > 0) {
    businessRegistrationNumber = businessRegistrationNumberInput.replace(/\D/g, "");
    if (businessRegistrationNumber.length !== 10) {
      throw new Error("사업자등록번호 10자리를 정확히 입력해주세요.");
    }
  }

  try {
    await prisma.$transaction([
      prisma.company.create({
        data: {
          ownerUserId,
          name: name.trim(),
          phone: phone.trim(),
          introText: typeof introText === "string" ? introText.trim() : null,
          businessHours: typeof businessHours === "string" ? businessHours.trim() : null,
          businessRegistrationNumber,
          representativeName:
            typeof representativeName === "string" && representativeName.trim().length > 0
              ? representativeName.trim()
              : null,
        },
      }),
      prisma.user.update({
        where: { id: ownerUserId },
        data: { role: "COMPANY" },
      }),
    ]);
  } catch (err) {
    // Prisma's unique constraint violation (P2002) on
    // businessRegistrationNumber — surfaced as a plain user-facing message
    // instead of the generic "알 수 없는 오류" toActionError/error handler
    // would otherwise give for a raw Prisma error.
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002") {
      throw new Error("이미 등록된 사업자등록번호예요.");
    }
    throw err;
  }
}

export async function updateCompanyProfileForOwner(
  ownerUserId: string,
  input: {
    name: unknown;
    phone: unknown;
    introText: unknown;
    businessHours: unknown;
    isAvailable: boolean;
    websiteUrl: unknown;
  }
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  const { name, phone, introText, businessHours, isAvailable, websiteUrl } = input;

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
  const websiteUrlInput = typeof websiteUrl === "string" ? websiteUrl.trim() : "";
  if (websiteUrlInput.length > MAX_WEBSITE_URL_LENGTH) {
    throw new Error("홈페이지 주소가 너무 길어요.");
  }
  const normalizedWebsiteUrl =
    websiteUrlInput.length > 0 ? normalizeWebsiteUrl(websiteUrlInput) : null;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      introText: typeof introText === "string" ? introText.trim() : null,
      businessHours: typeof businessHours === "string" ? businessHours.trim() : null,
      isAvailable,
      websiteUrl: normalizedWebsiteUrl,
    },
  });
}

const ALLOWED_DETAIL_PAGE_MODES = ["CUSTOM_IMAGE", "SITE_TEMPLATE"] as const;

export async function updateDetailPageModeForOwner(
  ownerUserId: string,
  mode: unknown
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  if (!ALLOWED_DETAIL_PAGE_MODES.includes(mode as (typeof ALLOWED_DETAIL_PAGE_MODES)[number])) {
    throw new Error("올바르지 않은 선택입니다.");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { detailPageMode: mode as (typeof ALLOWED_DETAIL_PAGE_MODES)[number] },
  });
}

export async function addServiceForOwner(
  ownerUserId: string,
  input: {
    categoryId: unknown;
    price: unknown;
    description: unknown;
    pricingUnit?: unknown;
    // Raw selections per select-type question key, straight off the form
    // (e.g. {"type": ["벽걸이형", "스탠드형"]}) — validated against that
    // category's actual question/option set below.
    supportedOptions?: Record<string, string[]>;
  }
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  const { categoryId, price: priceRaw, description, pricingUnit: pricingUnitRaw } = input;

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

  // Never trust the client's pricingUnit choice at face value — only
  // categories with a pricing quantity question (평수, 대수, ...) can be
  // priced PER_UNIT; anything else silently falls back to FLAT.
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error("존재하지 않는 청소 종류입니다.");
  }
  const pricingUnit: "FLAT" | "PER_UNIT" =
    pricingUnitRaw === "PER_UNIT" && supportsPerUnitPricing(category.slug) ? "PER_UNIT" : "FLAT";

  // Which options this company handles per select-type question (형태,
  // 타입, ...) — only relevant for categories that have one. Selecting
  // every option means "no restriction", stored as a missing key instead
  // of the full list, so a company that already picked "all" isn't
  // silently narrowed if the category's option list grows later.
  const selectQuestions = getReservationQuestions(category.slug).filter(
    (q) => q.type === "select" && q.options
  );
  let supportedOptions: Record<string, string[]> | null = null;
  if (selectQuestions.length > 0) {
    supportedOptions = {};
    for (const q of selectQuestions) {
      const selected = (input.supportedOptions?.[q.key] ?? []).filter((v) =>
        q.options!.includes(v)
      );
      if (selected.length === 0) {
        throw new Error(`${q.label}을(를) 최소 1개는 선택해주세요.`);
      }
      if (selected.length < q.options!.length) {
        supportedOptions[q.key] = selected;
      }
    }
    if (Object.keys(supportedOptions).length === 0) supportedOptions = null;
  }

  await prisma.companyService.upsert({
    where: { companyId_categoryId: { companyId: company.id, categoryId } },
    update: {
      price,
      pricingUnit,
      description: typeof description === "string" ? description.trim() : null,
      supportedOptions: supportedOptions ?? Prisma.DbNull,
    },
    create: {
      companyId: company.id,
      categoryId,
      price,
      pricingUnit,
      description: typeof description === "string" ? description.trim() : null,
      supportedOptions: supportedOptions ?? undefined,
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
  // categoryId tags a WORK/BEFORE_AFTER photo to one of the company's own
  // registered categories (e.g. 에어컨청소 vs 입주청소) so the public detail
  // page can show different photos depending on which service the customer
  // is looking at — omitted/null means "shown for every category", which
  // is also what every photo uploaded before this feature existed already
  // means, so nothing already-uploaded needs to change.
  input: { publicId: string; type?: string; categoryId?: string | null }
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  if (!input.publicId.startsWith(`companies/${company.id}/`)) {
    throw new Error("잘못된 업로드 정보입니다.");
  }

  let categoryId: string | null = null;
  if (input.categoryId) {
    const service = await prisma.companyService.findUnique({
      where: { companyId_categoryId: { companyId: company.id, categoryId: input.categoryId } },
    });
    if (!service) {
      throw new Error("등록되지 않은 청소 종류입니다.");
    }
    categoryId = input.categoryId;
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
    // format) is worth showing as-is. Anything else (a transient sharp/
    // network/Cloudinary failure) also gets shown, appending whatever detail
    // the error carries, instead of a bare generic message that hides
    // whether it was a size problem, a corrupt file, or something else —
    // the underlying message is safe to show (it's this owner's own upload,
    // seen only by them, never a customer).
    console.error("Photo re-encode failed:", err);
    if (err instanceof InvalidImageError) {
      throw err;
    }
    const detail = err instanceof Error ? err.message : null;
    throw new Error(
      detail
        ? `이미지 처리에 실패했어요: ${detail}`
        : "이미지 처리에 실패했어요. 다른 사진으로 다시 시도해주세요."
    );
  } finally {
    await deleteCloudinaryObject(input.publicId).catch(() => {});
  }

  const url = cloudinaryDeliveryUrl(getCloudinaryCloudName(), finalPublicId, "webp");
  const photoType = normalizePhotoType(input.type);

  await prisma.companyPhoto.create({
    data: { companyId: company.id, url, type: photoType, categoryId },
  });

  if (photoType === "MAIN") {
    await prisma.company.update({
      where: { id: company.id },
      data: { mainImageUrl: url },
    });
  }
}

const MAX_CAPTION_LENGTH = 60;

export async function updatePhotoCaptionForOwner(
  ownerUserId: string,
  photoId: string,
  caption: unknown
): Promise<void> {
  const company = await requireOwnedCompany(ownerUserId);

  const trimmed = typeof caption === "string" ? caption.trim() : "";
  if (trimmed.length > MAX_CAPTION_LENGTH) {
    throw new Error(`설명은 ${MAX_CAPTION_LENGTH}자 이하로 입력해주세요.`);
  }

  await prisma.companyPhoto.updateMany({
    where: { id: photoId, companyId: company.id },
    data: { caption: trimmed.length > 0 ? trimmed : null },
  });
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
