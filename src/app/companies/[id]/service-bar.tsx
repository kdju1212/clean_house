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
 * Coupang-style purchase block: the picked (or cheapest) service's price in
 * big red type, plus a fixed bottom bar with 전화문의 / 예약하기. Multiple
 * services (categories) no longer get an in-page picker here — that used
 * to open a bottom sheet, but the reservation form itself already lets the
 * customer pick (and multi-select) which of the company's OTHER cleaning
 * types (e.g. 이사청소, 에어컨청소) to book, so this just flags that they
 * exist ("다른 청소도 가능해요") and leaves the actual choice to 예약하기.
 */
export function ServiceBar({
  companyId,
  services,
  selectedId,
  websiteUrl,
  phone,
}: {
  companyId: string;
  services: Service[];
  selectedId: string | null;
  // The company's own site — when set, 예약하기 sends the customer there
  // (new tab) instead of into /reservations/new. We're a directory/
  // matching site and never handle payment ourselves, so a company that
  // already has its own booking flow just keeps using it.
  websiteUrl: string | null;
  phone: string | null;
}) {
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
      {priceService && (
        <div className="mt-5">
          <p className="flex items-baseline gap-1.5">
            {!selected && <span className="text-sm font-semibold text-neutral-500">최저</span>}
            <span className="text-[28px] font-bold leading-none text-[#e52528]">
              {formatPrice(priceService)}
            </span>
            {!selected && <span className="text-lg font-bold text-[#e52528]">~</span>}
          </p>
          {services.length > 1 && (
            <p className="mt-1 text-sm text-neutral-500">다른 청소도 가능해요</p>
          )}
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
