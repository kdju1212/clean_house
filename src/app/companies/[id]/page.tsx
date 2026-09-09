import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { toggleFavorite } from "./actions";

const PHOTO_TYPE_LABEL: Record<string, string> = {
  MAIN: "대표",
  WORK: "작업사진",
  BEFORE_AFTER: "전/후 비교",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, company, reviews, ratingSummary] = await Promise.all([
    auth(),
    prisma.company.findUnique({
      where: { id },
      include: {
        services: { include: { category: true }, orderBy: { createdAt: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
        regions: { include: { region: true } },
      },
    }),
    prisma.review.findMany({
      where: { companyId: id },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { companyId: id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  if (!company || company.status !== "ACTIVE") {
    notFound();
  }

  const isFavorited = session?.user
    ? !!(await prisma.favorite.findUnique({
        where: { customerId_companyId: { customerId: session.user.id, companyId: id } },
      }))
    : false;

  const averageRating = ratingSummary._avg.rating ?? 0;
  const reviewCount = ratingSummary._count;

  const galleryPhotos = company.mainImageUrl
    ? [
        { id: "main", url: company.mainImageUrl, type: "MAIN" },
        ...company.photos.filter((p) => p.url !== company.mainImageUrl),
      ]
    : company.photos;

  return (
    <main className="mx-auto w-full max-w-md flex-1 pb-24">
      {galleryPhotos.length > 0 ? (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
          {galleryPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square w-full shrink-0 snap-center bg-neutral-100"
            >
              <Image
                src={photo.url}
                alt={company.name}
                fill
                sizes="390px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-5xl">
          🧽
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{company.name}</h1>
          {session?.user ? (
            <form action={toggleFavorite}>
              <input type="hidden" name="companyId" value={company.id} />
              <SubmitButton
                aria-label={isFavorited ? "찜 해제" : "찜하기"}
                className="text-2xl leading-none"
              >
                {isFavorited ? "♥" : "♡"}
              </SubmitButton>
            </form>
          ) : (
            <Link
              href="/login"
              aria-label="찜하려면 로그인"
              className="text-2xl leading-none text-neutral-300"
            >
              ♡
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {reviewCount > 0 ? (
            <>
              <span className="font-semibold text-amber-500">★ {averageRating.toFixed(1)}</span>{" "}
              리뷰 {reviewCount}개
            </>
          ) : (
            "아직 리뷰가 없어요"
          )}
        </p>
        {company.introText && (
          <p className="mt-2 text-sm text-neutral-600">{company.introText}</p>
        )}

        <section className="mt-5">
          <h2 className="text-sm font-semibold">서비스 · 가격</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {company.services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{service.category.name}</p>
                  {service.description && (
                    <p className="text-xs text-neutral-500">
                      {service.description}
                    </p>
                  )}
                </div>
                <p className="font-semibold">
                  {service.price.toLocaleString()}원
                </p>
              </li>
            ))}
          </ul>
        </section>

        {company.photos.length > 0 && (
          <section className="mt-5">
            <h2 className="text-sm font-semibold">작업 사진</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {company.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
                >
                  <Image
                    src={photo.url}
                    alt={PHOTO_TYPE_LABEL[photo.type]}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">서비스 지역</span>
            <span className="text-right">
              {company.regions.map((r) => r.region.name).join(", ") || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">영업시간</span>
            <span>{company.businessHours ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">예약 가능 여부</span>
            <span>{company.isAvailable ? "예약 가능" : "예약 마감"}</span>
          </div>
          {company.phone && (
            <div className="flex justify-between">
              <span className="text-neutral-500">연락처</span>
              <span>{company.phone}</span>
            </div>
          )}
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold">
            리뷰 {reviewCount > 0 ? `(${reviewCount})` : ""}
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">
              아직 작성된 리뷰가 없어요.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-neutral-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-amber-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {review.createdAt.toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {review.customer.name ?? "익명"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-700">
                    {review.content}
                  </p>
                  {review.photoUrl && (
                    <div className="relative mt-2 aspect-square w-24 overflow-hidden rounded-lg bg-neutral-100">
                      <Image
                        src={review.photoUrl}
                        alt="리뷰 사진"
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <Link
                    href={`/reviews/${review.id}/report`}
                    className="mt-2 inline-block text-[11px] text-neutral-400 underline"
                  >
                    신고
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md border-t border-neutral-200 bg-white p-3">
        <Link
          href={`/reservations/new?companyId=${company.id}`}
          className="block rounded-xl bg-neutral-900 py-3 text-center text-sm font-semibold text-white"
        >
          예약하기
        </Link>
      </div>
    </main>
  );
}
