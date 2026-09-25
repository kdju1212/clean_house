"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/company-auth";
import { toActionError, type ActionState } from "@/lib/action-state";
import {
  addServiceForOwner,
  confirmPhotoUploadForOwner,
  createCompanyForOwner,
  deletePhotoForOwner,
  deleteServiceForOwner,
  requestPhotoUploadUrlForOwner,
  setRegionsForOwner,
  updateCompanyProfileForOwner,
  updateDetailPageModeForOwner,
  updatePhotoCaptionForOwner,
} from "@/lib/company-profile-service";

export async function createCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireSession();
    await createCompanyForOwner(session.user.id, {
      name: formData.get("name"),
      phone: formData.get("phone"),
      introText: formData.get("introText"),
      businessHours: formData.get("businessHours"),
      businessRegistrationNumber: formData.get("businessRegistrationNumber"),
      representativeName: formData.get("representativeName"),
    });
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
      websiteUrl: formData.get("websiteUrl"),
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
  categoryId?: string | null;
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

/** Called directly from a Client Component, same reasoning as
 * setCompanyRegionIds — an immediate toggle feels wrong routed through a
 * <form action> submit/reset cycle. */
export async function updateDetailPageMode(
  mode: string
): Promise<{ error: string } | { ok: true }> {
  try {
    const session = await requireSession();
    await updateDetailPageModeForOwner(session.user.id, mode);
    revalidatePath("/company/detail");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요." };
  }
}

/** Called directly from a Client Component — a caption field saves on
 * blur, not via a submit button, so there's no <form> to route through. */
export async function updatePhotoCaption(
  photoId: string,
  caption: string
): Promise<{ error: string } | { ok: true }> {
  try {
    const session = await requireSession();
    await updatePhotoCaptionForOwner(session.user.id, photoId, caption);
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
