import Image from "next/image";
import Link from "next/link";
import { ChatSmallIcon } from "@/components/icons";

/** One flat, Danggeun-style row in a category's company list — the parent
 * list draws the dividers between rows. Same layout as the mobile app's
 * CompanyListItem. */
export function CompanyListCard({
  id,
  categoryId,
  name,
  mainImageUrl,
  isAvailable,
  isVerified = false,
  hasBusinessRegistration = false,
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
   * instead of the company's general ones (see CompanyDetailDynamic). */
  categoryId?: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  /** Admin-verified business, shown as an orange "인증업체" tag. */
  isVerified?: boolean;
  /** Self-declared (entered a business registration number, unchecked) —
   * shown only when isVerified is false, as a gray tag. */
  hasBusinessRegistration?: boolean;
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
  const meta = [
    isAd ? "광고" : null,
    regionNames.join(", ") || null,
    reviewCount > 0 ? `★ ${rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={categoryId ? `/companies/${id}?categoryId=${categoryId}` : `/companies/${id}`}
      className="flex gap-4 py-4"
    >
      <div className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-lg border border-black/[0.06] bg-neutral-100">
        {mainImageUrl ? (
          <Image src={mainImageUrl} alt={name} fill sizes="110px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🧽</div>
        )}
      </div>

      <div className="flex min-h-[110px] min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 text-base leading-snug text-neutral-900">{name}</p>
        {meta && <p className="mt-1 truncate text-[13px] text-[#868b94]">{meta}</p>}
        <p className="mt-1 text-base font-bold text-neutral-900">
          {estimatedPrice != null
            ? `예상 ${estimatedPrice.toLocaleString()}원`
            : pricingUnit === "PER_UNIT"
              ? `${unitLabel}당 ${price.toLocaleString()}원~`
              : `${price.toLocaleString()}원~`}
        </p>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {isVerified ? (
            <span className="rounded bg-[#fff1e7] px-1.5 py-0.5 text-xs font-semibold text-[#ff6f0f]">
              ✓ 인증업체
            </span>
          ) : (
            hasBusinessRegistration && (
              <span className="rounded bg-[#f2f3f6] px-1.5 py-0.5 text-xs font-semibold text-[#4d5159]">
                사업자등록
              </span>
            )
          )}
          {!isAvailable && (
            <span className="rounded bg-[#f2f3f6] px-1.5 py-0.5 text-xs font-semibold text-[#4d5159]">
              예약마감
            </span>
          )}
        </div>

        {reviewCount > 0 && (
          <span className="mt-auto flex items-center gap-0.5 self-end text-[13px] text-[#868b94]">
            <ChatSmallIcon className="h-[15px] w-[15px] text-[#b0b3ba]" />
            {reviewCount}
          </span>
        )}
      </div>
    </Link>
  );
}
