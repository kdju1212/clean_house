"use client";

import { useState } from "react";
import { ServiceBar } from "./service-bar";
import { PhotoStack, type PhotoItem } from "@/components/company-detail/photo-stack";

type Service = {
  id: string;
  categoryId: string;
  categoryName: string;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  unitLabel: string | null;
  description: string | null;
};

type Photo = PhotoItem & { categoryId: string | null };

/**
 * Everything on the detail page that depends on which of the company's
 * categories the customer is currently looking at — intro text, the
 * service picker, and both photo galleries — lives here as one client
 * component instead of three, so picking a different service (or arriving
 * with ?categoryId= already set from the category listing) updates all
 * three together. A company with only 1개 사진/공통 소개글 never has to tag
 * anything: an untagged photo (categoryId null) and the company's general
 * introText both show for every category, exactly like before this
 * feature existed.
 */
export function CompanyDetailDynamic({
  companyId,
  services,
  companyIntroText,
  workPhotos,
  beforeAfterPhotos,
  initialCategoryId,
}: {
  companyId: string;
  services: Service[];
  companyIntroText: string | null;
  workPhotos: Photo[];
  beforeAfterPhotos: Photo[];
  initialCategoryId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCategoryId && services.some((s) => s.categoryId === initialCategoryId)
      ? initialCategoryId
      : services.length === 1
        ? services[0].categoryId
        : null
  );

  const selectedService = services.find((s) => s.categoryId === selectedId) ?? null;
  const introText = selectedService?.description || companyIntroText;

  const matchesSelected = (photo: Photo) =>
    photo.categoryId === null || photo.categoryId === selectedId;

  return (
    <>
      {introText && <p className="mt-2 text-sm text-neutral-600">{introText}</p>}

      <ServiceBar
        companyId={companyId}
        services={services}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <PhotoStack title="작업 사진" photos={workPhotos.filter(matchesSelected)} />
      <PhotoStack title="전/후 비교" photos={beforeAfterPhotos.filter(matchesSelected)} />
    </>
  );
}
