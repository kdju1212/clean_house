import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY_STATUS_BADGE_CLASS, COMPANY_STATUS_LABEL } from "@/lib/company";
import { requireAdmin } from "@/lib/admin";
import { SubmitButton } from "@/components/submit-button";
import { approveCompany, reactivateCompany, suspendCompany } from "../actions";

const PHOTO_TYPE_LABEL: Record<string, string> = {
  MAIN: "대표",
  WORK: "작업사진",
  BEFORE_AFTER: "전/후 비교",
};

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const [company, reservationCounts, ratingSummary] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, email: true } },
        services: { include: { category: true } },
        regions: { include: { region: true } },
        photos: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      where: { companyId: id },
      _count: true,
    }),
    prisma.review.aggregate({
      where: { companyId: id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  if (!company) notFound();

  const countByStatus = new Map(reservationCounts.map((r) => [r.status, r._count]));
  const totalReservations = reservationCounts.reduce((sum, r) => sum + r._count, 0);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-lg font-bold">{company.name}</h1>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COMPANY_STATUS_BADGE_CLASS[company.status]}`}
        >
          {COMPANY_STATUS_LABEL[company.status]}
        </span>
      </div>

      <section className="mt-4 flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">소유자</span>
          <span className="text-right">
            {company.owner.name ?? "-"} ({company.owner.email ?? "이메일 없음"})
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">연락처</span>
          <span>{company.phone ?? "-"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">등록일</span>
          <span>{company.createdAt.toLocaleDateString("ko-KR")}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">영업시간</span>
          <span>{company.businessHours ?? "-"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">예약 가능 여부</span>
          <span>{company.isAvailable ? "예약 가능" : "예약 마감"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-neutral-500">평점</span>
          <span>
            {ratingSummary._count > 0
              ? `★ ${(ratingSummary._avg.rating ?? 0).toFixed(1)} (리뷰 ${ratingSummary._count}개)`
              : "리뷰 없음"}
          </span>
        </div>
        {company.introText && (
          <div className="border-t border-neutral-100 pt-2">
            <p className="text-neutral-500">소개</p>
            <p className="mt-1">{company.introText}</p>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold">
          예약 현황 {totalReservations > 0 && `(${totalReservations})`}
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <span className="text-neutral-500">신청</span>
            <span className="font-medium">{countByStatus.get("REQUESTED") ?? 0}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <span className="text-neutral-500">확정</span>
            <span className="font-medium">{countByStatus.get("ACCEPTED") ?? 0}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <span className="text-neutral-500">완료</span>
            <span className="font-medium">{countByStatus.get("COMPLETED") ?? 0}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <span className="text-neutral-500">거절/취소</span>
            <span className="font-medium">
              {(countByStatus.get("REJECTED") ?? 0) + (countByStatus.get("CANCELLED") ?? 0)}
            </span>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold">서비스 · 가격</h2>
        {company.services.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">등록된 서비스가 없어요.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {company.services.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.category.name}</span>
                <span className="font-medium">{s.price.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-neutral-500">서비스 지역</p>
        <p className="mt-1">
          {company.regions.map((r) => r.region.name).join(", ") || "-"}
        </p>
      </section>

      {company.photos.length > 0 && (
        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">사진</h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {company.photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
              >
                <Image
                  src={photo.url}
                  alt={PHOTO_TYPE_LABEL[photo.type]}
                  fill
                  sizes="90px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4 flex gap-2">
        {company.status === "PENDING" && (
          <form action={approveCompany}>
            <input type="hidden" name="companyId" value={company.id} />
            <SubmitButton
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              pendingText="처리 중..."
            >
              승인
            </SubmitButton>
          </form>
        )}
        {company.status === "ACTIVE" && (
          <form action={suspendCompany}>
            <input type="hidden" name="companyId" value={company.id} />
            <SubmitButton
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600"
              pendingText="처리 중..."
            >
              비활성화
            </SubmitButton>
          </form>
        )}
        {company.status === "SUSPENDED" && (
          <form action={reactivateCompany}>
            <input type="hidden" name="companyId" value={company.id} />
            <SubmitButton
              className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
              pendingText="처리 중..."
            >
              재활성화
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
