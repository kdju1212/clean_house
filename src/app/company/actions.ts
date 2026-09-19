"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/company-auth";
import { toActionError, type ActionState } from "@/lib/action-state";
import {
  addServiceForOwner,
  confirmPhotoUploadForOwner,
  deletePhotoForOwner,
  deleteServiceForOwner,
  requestPhotoUploadUrlForOwner,
  setRegionsForOwner,
  updateCompanyProfileForOwner,
} from "@/lib/company-profile-service";

const MAX_NAME_LENGTH = 60;
const MAX_PHONE_LENGTH = 30;
const MAX_INTRO_LENGTH = 1000;
const MAX_BUSINESS_HOURS_LENGTH = 100;

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
    await updateCompanyProfileForOwner(session.user.id, {
      name: formData.get("name"),
      phone: formData.get("phone"),
      introText: formData.get("introText"),
      businessHours: formData.get("businessHours"),
      isAvailable: formData.get("isAvailable") === "on",
    });

    revalidatePath("/company");
    revalidatePath("/company/detail");
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

    // Each select-type question's supported options come in as several
    // "supported_<key>" checkboxes (one per checked option) — same
    // grouping the reservation form's own multi-select fields use, see
    // reservations/actions.ts.
    const supportedOptions: Record<string, string[]> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("supported_") || typeof value !== "string") continue;
      const questionKey = key.slice("supported_".length);
      (supportedOptions[questionKey] ??= []).push(value);
    }

    await addServiceForOwner(session.user.id, {
      categoryId: formData.get("categoryId"),
      price: formData.get("price"),
      description: formData.get("description"),
      pricingUnit: formData.get("pricingUnit"),
      supportedOptions,
    });

    revalidatePath("/company");
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteService(formData: FormData) {
  const session = await requireSession();
  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string") return;

  await deleteServiceForOwner(session.user.id, serviceId);
  revalidatePath("/company");
}

/**
 * Called directly from a Client Component (not a <form action>) — the
 * region picker's `selected` Map is the client-side source of truth, and
 * routing the save through a plain <form action> caused the browser to
 * reset the search-results checkboxes' visual checked state shortly after
 * a successful submit (React's own state stayed correct — still visible
 * via the "선택된 지역" chips — but the DOM checkbox fell out of sync with
 * it). Calling the action directly with the id array sidesteps the
 * native form submission/reset lifecycle entirely.
 */
export async function setCompanyRegionIds(
  regionIds: string[]
): Promise<{ error: string } | { ok: true }> {
  try {
    const session = await requireSession();
    await setRegionsForOwner(session.user.id, regionIds);
    revalidatePath("/company");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

/**
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
    return await requestPhotoUploadUrlForOwner(session.user.id, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

export async function confirmPhotoUpload(input: {
  publicId: string;
  type?: string;
}): Promise<{ error: string } | { ok: true }> {
  try {
    const session = await requireSession();
    await confirmPhotoUploadForOwner(session.user.id, input);
    // Uploaded from /company/detail's live preview — /company itself no
    // longer shows photos, but keep revalidating it too in case anything
    // there ever reads mainImageUrl again.
    revalidatePath("/company");
    revalidatePath("/company/detail");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

export async function deletePhoto(formData: FormData) {
  const session = await requireSession();
  const photoId = formData.get("photoId");
  if (typeof photoId !== "string") return;

  await deletePhotoForOwner(session.user.id, photoId);
  revalidatePath("/company");
  revalidatePath("/company/detail");
}
