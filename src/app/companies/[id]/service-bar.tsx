"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

type Service = {
  id: string;
  categoryId: string;
  categoryName: string;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  unitLabel: string | null;
  description: string | null;
};

function formatPrice(service: Service): string {
  return service.pricingUnit === "PER_UNIT" && service.unitLabel
    ? `${service.unitLabel}당 ${service.price.toLocaleString()}원`
    : `${service.price.toLocaleString()}원`;
}

/**
 * Coupang-style purchase block: a bordered "옵션선택" box that opens a
 * bottom sheet of the company's services, the picked (or cheapest)
 * service's price in big red type, and a fixed bottom bar with 전화문의 /
 * 예약하기. 예약하기 carries the pick straight into the reservation form
 * via ?categoryId=.
 *
 * Selection is controlled by the parent (CompanyDetailDynamic) rather than
 * owned here, since the intro text and detail photos around this block
 * also depend on which category is picked.
 */
export function ServiceBar({
  companyId,
  services,
  selectedId,
  onSelect,
  websiteUrl,
  phone,
}: {
  companyId: string;
  services: Service[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  // The company's own site — when set, 예약하기 sends the customer there
  // (new tab) instead of into /reservations/new. We're a directory/
  // matching site and never handle payment ourselves, so a company that
  // already has its own booking flow just keeps using it.
  websiteUrl: string | null;
  phone: string | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const cheapest = services.reduce<Service | null>(
    (min, s) => (!min || s.price < min.price ? s : min),
    null
  );
  const selected = services.find((s) => s.categoryId === selectedId) ?? null;
  const priceService = selected ?? cheapest;

  const reserveHref = websiteUrl
    ? websiteUrl
    : selected
      ? `/reservations/new?companyId=${companyId}&categoryId=${selected.categoryId}`
      : `/reservations/new?companyId=${companyId}`;

  if (services.length === 0) {
    return <p className="mt-5 text-sm text-neutral-400">등록된 서비스가 없어요.</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-5 flex w-full items-center justify-between rounded-lg border border-neutral-300 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm text-neutral-500">옵션선택</span>
          <span className="mt-0.5 block truncate text-lg font-bold text-neutral-900">
            {selected ? selected.categoryName : "서비스를 선택해주세요"}
          </span>
        </span>
        <ChevronRightIcon className="h-6 w-6 shrink-0 text-neutral-700" />
      </button>

      {priceService && (
        <p className="mt-5 flex items-baseline gap-1.5">
          {!selected && <span className="text-sm font-semibold text-neutral-500">최저</span>}
          <span className="text-[28px] font-bold leading-none text-[#e52528]">
            {formatPrice(priceService)}
          </span>
          {!selected && <span className="text-lg font-bold text-[#e52528]">~</span>}
        </p>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setSheetOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-white pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <h2 className="text-lg font-bold">옵션선택</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setSheetOpen(false)}
                className="text-2xl leading-none text-neutral-400"
              >
                ×
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto border-t border-neutral-100">
              {services.map((service) => {
                const isSelected = service.categoryId === selectedId;
                return (
                  <li key={service.id} className="border-b border-neutral-100">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        onSelect(service.categoryId);
                        setSheetOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${
                        isSelected ? "bg-[#f0f4ff]" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-[15px] ${isSelected ? "font-bold text-[#346aff]" : "font-medium"}`}>
                          {service.categoryName}
                        </span>
                        {service.description && (
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {service.description}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[15px] font-bold">{formatPrice(service)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md gap-2 border-t border-neutral-200 bg-white p-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex flex-1 items-center justify-center rounded-md border border-[#346aff] py-3.5 text-[15px] font-bold text-[#346aff]"
          >
            전화문의
          </a>
        )}
        <Link
          href={reserveHref}
          target={websiteUrl ? "_blank" : undefined}
          rel={websiteUrl ? "noopener noreferrer" : undefined}
          className="flex flex-1 items-center justify-center rounded-md bg-[#346aff] py-3.5 text-[15px] font-bold text-white"
        >
          {websiteUrl ? "홈페이지에서 예약하기" : "예약하기"}
        </Link>
      </div>
    </>
  );
}
