import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addService,
  deletePhoto,
  deleteService,
  setRegions,
  updateProfile,
} from "./actions";
import { PhotoUploadForm } from "./photo-upload-form";

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

  const [allCategories, allRegions, requestedCount] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.region.findMany({ orderBy: { name: "asc" } }),
    prisma.reservation.count({
      where: { companyId: company.id, status: "REQUESTED" },
    }),
  ]);

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

      {/* 프로필 */}
      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">기본 정보</h2>
        <form action={updateProfile} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            업체명
            <input
              name="name"
              defaultValue={company.name}
              required
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            연락처
            <input
              name="phone"
              defaultValue={company.phone ?? ""}
              required
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            업체 소개
            <textarea
              name="introText"
              defaultValue={company.introText ?? ""}
              rows={3}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            영업시간
            <input
              name="businessHours"
              defaultValue={company.businessHours ?? ""}
              placeholder="예: 09:00 - 18:00"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isAvailable"
              defaultChecked={company.isAvailable}
            />
            현재 예약 가능
          </label>
          <button
            type="submit"
            className="mt-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            저장
          </button>
        </form>
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
                  <button type="submit" className="text-xs text-neutral-400 underline">
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addService} className="mt-3 flex flex-col gap-2">
          <select
            name="categoryId"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="">청소 종류 선택</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {usedCategoryIds.has(c.id) ? " (등록됨 · 가격 수정)" : ""}
              </option>
            ))}
          </select>
          <input
            name="price"
            type="number"
            min={0}
            step={1000}
            required
            placeholder="가격 (원)"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <input
            name="description"
            placeholder="설명 (선택, 예: 25평 기준)"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
          >
            추가 / 수정
          </button>
        </form>
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
          <button
            type="submit"
            className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
          >
            저장
          </button>
        </form>
      </section>

      {/* 사진 */}
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">사진</h2>

        {company.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {company.photos.map((photo) => (
              <div key={photo.id} className="relative">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-100">
                  <Image
                    src={photo.url}
                    alt={PHOTO_TYPE_LABEL[photo.type]}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <p className="mt-1 text-center text-[11px] text-neutral-500">
                  {PHOTO_TYPE_LABEL[photo.type]}
                </p>
                <form action={deletePhoto} className="text-center">
                  <input type="hidden" name="photoId" value={photo.id} />
                  <button type="submit" className="text-[11px] text-neutral-400 underline">
                    삭제
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <PhotoUploadForm />
      </section>
    </main>
  );
}
