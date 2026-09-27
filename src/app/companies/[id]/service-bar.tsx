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
 * big red type, a plain list of the company's other cleaning types (e.g.
 * 이사청소, 에어컨청소) with their own prices, and a fixed bottom bar with
 * 전화문의 / 예약하기. The list used to be a clickable bottom sheet that
 * changed the selection right here, but the reservation form itself
 * already lets the customer pick (and multi-select) services, so this is
 * read-only — just informs, and leaves the actual choice to 예약하기.
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
  // Everything except the one already shown big above, so the list below
  // never repeats it.
  const otherServices = services.filter((s) => s.categoryId !== priceService?.categoryId);

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
          {otherServices.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-neutral-500">다른 청소도 가능해요</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {otherServices.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between text-sm text-neutral-700"
                  >
                    <span>{service.categoryName}</span>
                    <span className="font-medium">{formatPrice(service)}</span>
                  </li>
                ))}
              </ul>
            </div>
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
