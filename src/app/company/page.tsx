import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { deleteService } from "./actions";
import { CompanyPagePreview } from "./company-page-preview";
import { ProfileForm } from "./profile-form";
import { AddServiceForm } from "./add-service-form";
import { RegionSelectForm } from "./region-select-form";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사중",
  ACTIVE: "활성 (고객에게 노출됨)",
  SUSPENDED: "비활성화됨",
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
      // parent included so the region-select form can show "구 동" labels
      // for the company's existing picks without a second query.
      regions: { include: { region: { include: { parent: true } } } },
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

  const [allCategories, legacyRegions, requestedCount, reviews, ratingSummary] =
    await Promise.all([
      prisma.category.findMany({ orderBy: { order: "asc" } }),
      // Legacy flat regions predating the 시/도->시/군/구->동 hierarchy —
      // still directly selectable, shown under their own "기타" group.
      // (Search — see /api/mobile/regions/search-groups — replaced eagerly
      // fetching all ~256 시/군/구 with all ~5,000 동 here; that full tree
      // shipped down on every page load was what made this page slow.)
      prisma.region.findMany({
        where: { level: "EUPMYEONDONG", parentId: null },
        orderBy: { order: "asc" },
      }),
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
  const initialSelectedRegions = company.regions.map((r) => ({
    id: r.region.id,
    label: r.region.parent ? `${r.region.parent.name} ${r.region.name}` : r.region.name,
  }));

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
        <p className="mt-1 text-xs text-neutral-400">
          차량으로 이동 가능한 지역을 모두 선택해주세요. 구 전체를 선택하면
          소속된 동 전체가 서비스 지역에 포함돼요.
        </p>
        <RegionSelectForm
          legacyRegions={legacyRegions}
          initialSelectedRegions={initialSelectedRegions}
        />
      </section>

      {/* 미리보기 — 실제 업체 페이지와 동일한 레이아웃, 사진은 탭해서 바로 등록/변경 */}
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">미리보기</h2>
          {company.status === "ACTIVE" && (
            <Link
              href={`/companies/${company.id}`}
              target="_blank"
              className="text-xs font-medium text-neutral-500 underline"
            >
              실제 페이지에서 열기 ↗
            </Link>
          )}
        </div>
        {company.status === "PENDING" && (
          <p className="mb-2 px-1 text-[11px] text-neutral-400">
            승인 전이라 고객에게는 아직 안 보여요. 아래는 승인 후 보일 모습이에요.
          </p>
        )}

        <CompanyPagePreview
          company={{
            name: company.name,
            introText: company.introText,
            businessHours: company.businessHours,
            isAvailable: company.isAvailable,
            phone: company.phone,
            mainImageUrl: company.mainImageUrl,
          }}
          services={company.services.map((s) => ({
            id: s.id,
            categoryName: s.category.name,
            price: s.price,
            description: s.description,
          }))}
          regionNames={company.regions.map((r) => r.region.name)}
          averageRating={averageRating}
          reviewCount={reviewCount}
          workPhotos={company.photos.filter((p) => p.type === "WORK")}
          beforeAfterPhotos={company.photos.filter((p) => p.type === "BEFORE_AFTER")}
        />
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
