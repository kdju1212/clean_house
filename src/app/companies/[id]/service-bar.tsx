"use client";

import Link from "next/link";

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
 * Coupang-style option list + sticky bottom purchase bar: tap a service to
 * select it (highlighted, like picking a product option), the bar updates
 * to show its price, and 예약하기 carries the pick straight into the
 * reservation form via ?categoryId= instead of making the customer choose
 * again from a plain dropdown there.
 *
 * Selection is controlled by the parent (CompanyDetailDynamic) rather than
 * owned here, since the intro text and photo galleries above/below this
 * section also need to know which category is currently picked.
 */
export function ServiceBar({
  companyId,
  services,
  selectedId,
  onSelect,
  websiteUrl,
}: {
  companyId: string;
  services: Service[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  // The company's own site — when set, the button below sends the customer
  // there (new tab) instead of into /reservations/new. We're a directory/
  // matching site and never handle payment ourselves, so a company that
  // already has its own booking flow just keeps using it.
  websiteUrl: string | null;
}) {
  const cheapest = services.reduce<Service | null>(
    (min, s) => (!min || s.price < min.price ? s : min),
    null
  );

  const selected = services.find((s) => s.categoryId === selectedId) ?? null;
  const barService = selected ?? cheapest;

  const reserveHref = websiteUrl
    ? websiteUrl
    : selected
      ? `/reservations/new?companyId=${companyId}&categoryId=${selected.categoryId}`
      : `/reservations/new?companyId=${companyId}`;

  return (
    <>
      <section className="mt-5">
        <h2 className="text-sm font-semibold">서비스 · 가격</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {services.map((service) => {
            const isSelected = service.categoryId === selectedId;
            return (
              <li key={service.id}>
                <button
                  type="button"
                  onClick={() => onSelect(service.categoryId)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                  }`}
                >
                  <div>
                    <p className="font-medium">{service.categoryName}</p>
                    {service.description && (
                      <p className="text-xs text-neutral-500">{service.description}</p>
                    )}
                  </div>
                  <p className="font-semibold">{formatPrice(service)}</p>
                </button>
              </li>
            );
          })}
          {services.length === 0 && (
            <li className="text-sm text-neutral-400">등록된 서비스가 없어요.</li>
          )}
        </ul>
      </section>

      {services.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md items-center gap-3 border-t border-neutral-200 bg-white p-3">
          <div className="flex-1">
            <p className="text-[11px] text-neutral-400">{selected ? "선택한 서비스" : "시작가"}</p>
            <p className="text-base font-bold">
              {barService ? formatPrice(barService) : null}
              {!selected && "~"}
            </p>
          </div>
          <Link
            href={reserveHref}
            target={websiteUrl ? "_blank" : undefined}
            rel={websiteUrl ? "noopener noreferrer" : undefined}
            className="rounded-xl bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white"
          >
            {websiteUrl ? "홈페이지에서 예약하기" : "예약하기"}
          </Link>
        </div>
      )}
    </>
  );
}
