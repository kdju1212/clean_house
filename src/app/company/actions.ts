"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCompanyImage, deleteCompanyImage, InvalidImageError } from "@/lib/storage";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("로그인이 필요합니다.");
  }
  return session;
}

async function requireOwnedCompany(userId: string) {
  const company = await prisma.company.findUnique({
    where: { ownerUserId: userId },
  });
  if (!company) {
    throw new Error("등록된 업체가 없습니다.");
  }
  return company;
}

export async function createCompany(formData: FormData) {
  const session = await requireSession();

  const existing = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
  });
  if (existing) {
    redirect("/company");
  }

  const name = formData.get("name");
  const phone = formData.get("phone");
  const introText = formData.get("introText");
  const businessHours = formData.get("businessHours");

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("업체명을 입력해주세요.");
  }
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new Error("연락처를 입력해주세요.");
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

  redirect("/company");
}

export async function updateProfile(formData: FormData) {
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
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new Error("연락처를 입력해주세요.");
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
}

export async function addService(formData: FormData) {
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

export async function uploadPhoto(formData: FormData) {
  const session = await requireSession();
  const company = await requireOwnedCompany(session.user.id);

  const file = formData.get("file");
  const type = formData.get("type");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("사진을 선택해주세요.");
  }
  const photoType = type === "MAIN" || type === "BEFORE_AFTER" ? type : "WORK";

  let url: string;
  try {
    url = await saveCompanyImage(company.id, file);
  } catch (error) {
    if (error instanceof InvalidImageError) {
      throw new Error(error.message);
    }
    throw error;
  }

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
  await deleteCompanyImage(photo.url);

  if (company.mainImageUrl === photo.url) {
    await prisma.company.update({
      where: { id: company.id },
      data: { mainImageUrl: null },
    });
  }

  revalidatePath("/company");
}
