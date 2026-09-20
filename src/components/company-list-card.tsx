import Image from "next/image";
import Link from "next/link";

export function CompanyListCard({
  id,
  categoryId,
  name,
  mainImageUrl,
  isAvailable,
  isVerified = false,
  hasBusinessRegistration = false,
  introText,
  price,
  pricingUnit = "FLAT",
  estimatedPrice = null,
  unitLabel,
  rating,
  reviewCount,
  regionNames,
  isAd = false,
}: {
  id: string;
  /** Which category this row was listed under — carried into the detail
   * page link so it opens already showing that category's own 소개/사진
   * instead of the company's general ones (see CompanyDetailDynamic).
   * Omitted on the region-wide "전체" tab, which has no single category. */
  categoryId?: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  /** Admin-verified business, shown as a small trust badge next to the name. */
  isVerified?: boolean;
  /** Self-declared (entered a business registration number, unchecked) —
   * shown only when isVerified is false, a lighter version of the same badge. */
  hasBusinessRegistration?: boolean;
  introText: string | null;
  price: number;
  /** PER_UNIT services show "평당 price원~" instead of a flat "price원~". */
  pricingUnit?: "FLAT" | "PER_UNIT";
  /** price * the customer's saved quantity (see CategoryProfile) — shown
   * instead of the raw per-unit rate when available. */
  estimatedPrice?: number | null;
  /** "평" / "대" — required whenever pricingUnit is "PER_UNIT". */
  unitLabel?: string;
  rating: number;
  reviewCount: number;
  regionNames: string[];
  isAd?: boolean;
}) {
  return (
    <Link
      href={categoryId ? `/companies/${id}?categoryId=${categoryId}` : `/companies/${id}`}
      className={`flex gap-3 rounded-2xl border bg-white p-3 ${
        isAd ? "border-amber-200" : "border-neutral-200"
      }`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {mainImageUrl ? (
          <Image
            src={mainImageUrl}
            alt={name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">
            🧽
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {isAd && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                광고
              </span>
            )}
            <p className="truncate font-medium">{name}</p>
            {isVerified ? (
              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                인증
              </span>
            ) : (
              hasBusinessRegistration && (
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                  사업자등록
                </span>
              )
            )}
          </div>
          {!isAvailable && (
            <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
              예약 마감
            </span>
          )}
        </div>
        {reviewCount > 0 && (
          <p className="mt-0.5 text-xs text-neutral-500">
            <span className="font-medium text-amber-500">
              ★ {rating.toFixed(1)}
            </span>{" "}
            리뷰 {reviewCount}개
          </p>
        )}
        {introText && (
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {introText}
          </p>
        )}
        {estimatedPrice != null ? (
          <p className="mt-1 text-sm font-semibold">
            예상 {estimatedPrice.toLocaleString()}원{" "}
            <span className="text-xs font-normal text-neutral-400">
              ({unitLabel}당 {price.toLocaleString()}원 기준)
            </span>
          </p>
        ) : pricingUnit === "PER_UNIT" ? (
          <p className="mt-1 text-sm font-semibold">
            {unitLabel}당 {price.toLocaleString()}원~
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold">{price.toLocaleString()}원~</p>
        )}
        <p className="mt-auto truncate text-[11px] text-neutral-400">
          {regionNames.join(", ")}
        </p>
      </div>
    </Link>
  );
}
