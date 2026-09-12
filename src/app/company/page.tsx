import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { deletePhoto, deleteService, setRegions } from "./actions";
import { PhotoUploadForm } from "./photo-upload-form";
import { ProfileForm } from "./profile-form";
import { AddServiceForm } from "./add-service-form";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사중",
  ACTIVE: "활성 (고객에게 노출됨)",
  SUSPENDED: "비활성화됨",
};

const PHOTO_TYPE_LABEL: Record<string, string> = {
  MAIN: "대표",
  WORK: "작업사진",
  BEFORE_AFTER: "전/후 비교",
};

export default async function CompanyDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
    include: {
      services: { include: { category: true }, orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
      regions: { include: { region: true } },
    },
  });

  if (!company) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-lg font-bold">업체 관리</h1>
        <p className="mt-2 text-sm text-neutral-500">
          아직 등록된 업체가 없어요. 먼저 업체를 등록해주세요.
        </p>
        <Link
          href="/company/register"
          className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          업체 등록하기
        </Link>
      </main>
    );
  }

  const [allCategories, allRegions, requestedCount, reviews, ratingSummary] =
    await Promise.all([
      prisma.category.findMany({ orderBy: { order: "asc" } }),
      prisma.region.findMany({ orderBy: { name: "asc" } }),
      prisma.reservation.count({
        where: { companyId: company.id, status: "REQUESTED" },
      }),
      prisma.review.findMany({
        where: { companyId: company.id },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.aggregate({
        where: { companyId: company.id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
  const averageRating = ratingSummary._avg.rating ?? 0;
  const reviewCount = ratingSummary._count;

  const usedCategoryIds = new Set(company.services.map((s) => s.categoryId));
  const selectedRegionIds = new Set(company.regions.map((r) => r.regionId));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{company.name}</h1>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          {STATUS_LABEL[company.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {reviewCount > 0 ? (
          <>
            <span className="font-semibold text-amber-500">
              ★ {averageRating.toFixed(1)}
            </span>{" "}
            리뷰 {reviewCount}개
          </>
        ) : (
          "아직 리뷰가 없어요"
        )}
      </p>
      {company.status === "PENDING" && (
        <p className="mt-1 text-xs text-neutral-500">
          관리자 승인 후 고객에게 노출됩니다. 그 전까지 프로필/서비스/사진은
          자유롭게 준비해주세요.
        </p>
      )}

      <Link
        href="/company/reservations"
        className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold"
      >
        예약 관리
        <span className="flex items-center gap-2 text-neutral-400">
          {requestedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              신규 {requestedCount}건
            </span>
          )}
          →
        </span>
      </Link>

      <Link
        href="/company/ads"
        className="mt-3 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold"
      >
        광고 관리
        <span aria-hidden className="text-neutral-400">
          →
        </span>
      </Link>

      {/* 프로필 */}
      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">기본 정보</h2>
        <ProfileForm
          name={company.name}
          phone={company.phone ?? ""}
          introText={company.introText ?? ""}
          businessHours={company.businessHours ?? ""}
          isAvailable={company.isAvailable}
        />
      </section>

      {/* 서비스/가격 */}
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">서비스 · 가격</h2>

        {company.services.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {company.services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{service.category.name}</p>
                  <p className="text-neutral-500">
                    {service.price.toLocaleString()}원
                    {service.description ? ` · ${service.description}` : ""}
                  </p>
                </div>
                <form action={deleteService}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <SubmitButton className="text-xs text-neutral-400 underline" pendingText="삭제 중...">
                    삭제
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        <AddServiceForm categories={allCategories} usedCategoryIds={usedCategoryIds} />
      </section>

      {/* 서비스 지역 */}
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">서비스 지역</h2>
        <form action={setRegions} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {allRegions.map((region) => (
              <label
                key={region.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="regionIds"
                  value={region.id}
                  defaultChecked={selectedRegionIds.has(region.id)}
                />
                {region.name}
              </label>
            ))}
          </div>
          <SubmitButton
            className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
            pendingText="저장 중..."
          >
            저장
          </SubmitButton>
        </form>
      </section>

      {/* 사진 */}
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">사진</h2>

        {company.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {company.photos.map((photo) => {
              // company.mainImageUrl is the URL actually shown as this
              // company's cover photo elsewhere (listing cards, etc.) — it's
              // whichever photo was *most recently* uploaded as type MAIN,
              // which can differ from "any photo tagged MAIN" if there's
              // more than one, so mark the one that's actually active.
              const isActiveMain = company.mainImageUrl === photo.url;
              return (
                <div key={photo.id} className="relative">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-100">
                    <Image
                      src={photo.url}
                      alt={PHOTO_TYPE_LABEL[photo.type]}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                    {isActiveMain && (
                      <span className="absolute left-1 top-1 rounded-full bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        ★ 대표
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-center text-[11px] text-neutral-500">
                    {PHOTO_TYPE_LABEL[photo.type]}
                  </p>
                  <form action={deletePhoto} className="text-center">
                    <input type="hidden" name="photoId" value={photo.id} />
                    <SubmitButton className="text-[11px] text-neutral-400 underline" pendingText="삭제 중...">
                      삭제
                    </SubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <PhotoUploadForm />
      </section>

      {/* 받은 리뷰 */}
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">
          받은 리뷰 {reviewCount > 0 ? `(${reviewCount})` : ""}
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            아직 받은 리뷰가 없어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-neutral-100 p-3"
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
