import Image from "next/image";
import Link from "next/link";

export function CompanyListCard({
  id,
  name,
  mainImageUrl,
  isAvailable,
  introText,
  price,
  rating,
  reviewCount,
  regionNames,
  isAd = false,
}: {
  id: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  introText: string | null;
  price: number;
  rating: number;
  reviewCount: number;
  regionNames: string[];
  isAd?: boolean;
}) {
  return (
    <Link
      href={`/companies/${id}`}
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
        <p className="mt-1 text-sm font-semibold">{price.toLocaleString()}원~</p>
        <p className="mt-auto truncate text-[11px] text-neutral-400">
          {regionNames.join(", ")}
        </p>
      </div>
    </Link>
  );
}
