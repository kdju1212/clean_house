import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      services: { include: { category: true }, orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
      regions: { include: { region: true } },
    },
  });

  if (!company || company.status !== "ACTIVE") {
    notFound();
  }

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
        <h1 className="text-xl font-bold">{company.name}</h1>
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
