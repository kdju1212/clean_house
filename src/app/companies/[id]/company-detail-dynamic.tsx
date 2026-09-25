"use client";

import { useState } from "react";
import { ServiceBar } from "./service-bar";
import { PhotoStack, type PhotoItem } from "@/components/company-detail/photo-stack";
import { PhotoGrid } from "@/components/company-detail/photo-grid";
import { SparkleIcon } from "@/components/icons";

type Service = {
  id: string;
  categoryId: string;
  categoryName: string;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  unitLabel: string | null;
  description: string | null;
};

type Photo = PhotoItem & { categoryId: string | null; caption: string | null };

/**
 * Everything on the detail page that depends on which of the company's
 * categories the customer is currently looking at — intro text, the
 * option/price block, and both detail photo galleries — lives here as one
 * client component, so picking a different service (or arriving with
 * ?categoryId= already set from the category listing) updates them
 * together. A company with only 1개 사진/공통 소개글 never has to tag
 * anything: an untagged photo (categoryId null) and the company's general
 * introText both show for every category.
 */
export function CompanyDetailDynamic({
  companyId,
  services,
  companyIntroText,
  attributes,
  workPhotos,
  detailPageMode,
  initialCategoryId,
  websiteUrl,
  phone,
}: {
  companyId: string;
  services: Service[];
  companyIntroText: string | null;
  /** Coupang's "경도 중간"-style label/value lines under the title. */
  attributes: { label: string; value: string }[];
  workPhotos: Photo[];
  detailPageMode: "CUSTOM_IMAGE" | "SITE_TEMPLATE";
  initialCategoryId: string | null;
  // The company's own site — when set, ServiceBar sends the customer there
  // to book instead of into our own reservation flow (see its own comment).
  websiteUrl: string | null;
  phone: string | null;
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
  const visibleWork = workPhotos.filter(matchesSelected);

  return (
    <>
      {introText && (
        <p className="mt-3 flex w-fit max-w-full gap-1.5 rounded-md bg-[#f5f6f8] px-2.5 py-1.5 text-[15px] text-neutral-700">
          <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#346aff]" />
          <span>{introText}</span>
        </p>
      )}

      {attributes.length > 0 && (
        <dl className="mt-4 space-y-1.5 text-[15px]">
          {attributes.map((a) => (
            <div key={a.label} className="flex gap-3">
              <dt className="w-20 shrink-0 whitespace-nowrap text-neutral-400">{a.label}</dt>
              <dd className="min-w-0 text-neutral-800">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <ServiceBar
        companyId={companyId}
        services={services}
        selectedId={selectedId}
        onSelect={setSelectedId}
        websiteUrl={websiteUrl}
        phone={phone}
      />

      {visibleWork.length > 0 && (
        <section id="detail" className="scroll-mt-16">
          <div className="-mx-4 mt-6 h-2 bg-[#f2f3f6]" />
          {detailPageMode === "SITE_TEMPLATE" ? (
            <PhotoGrid title="상세페이지" photos={visibleWork} />
          ) : (
            <PhotoStack title="상세페이지" photos={visibleWork} />
          )}
        </section>
      )}
    </>
  );
}
