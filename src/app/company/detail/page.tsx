import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyPagePreview } from "../company-page-preview";

export default async function CompanyDetailEditPage() {
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
    notFound();
  }

  const ratingSummary = await prisma.review.aggregate({
    where: { companyId: company.id },
    _avg: { rating: true },
    _count: true,
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-16">
      <Link href="/company" className="text-xs font-medium text-neutral-400 underline">
        ← 업체 관리로 돌아가기
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">상세페이지 수정</h1>
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
      <p className="mt-1 text-xs text-neutral-400">
        {company.status === "PENDING"
          ? "승인 전이라 고객에게는 아직 안 보여요. 아래는 승인 후 보일 모습이에요."
          : "고객에게 실제로 보이는 페이지예요. 사진은 탭해서 바로 등록/변경할 수 있어요."}
      </p>

      <div className="mt-4">
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
          averageRating={ratingSummary._avg.rating ?? 0}
          reviewCount={ratingSummary._count}
          workPhotos={company.photos.filter((p) => p.type === "WORK")}
          beforeAfterPhotos={company.photos.filter((p) => p.type === "BEFORE_AFTER")}
        />
      </div>
    </main>
  );
}
