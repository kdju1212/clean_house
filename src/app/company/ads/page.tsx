import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AD_STATUS_BADGE_CLASS, AD_STATUS_LABEL, getAdStatus } from "@/lib/ad";
import { SubmitButton } from "@/components/submit-button";
import { cancelAd } from "./actions";
import { ApplyAdForm } from "./apply-ad-form";

export default async function CompanyAdsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { ownerUserId: session.user.id },
    include: { services: { include: { category: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!company) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-lg font-bold">광고 관리</h1>
        <p className="mt-2 text-sm text-neutral-500">
          아직 등록된 업체가 없어요.
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

  const ads = await prisma.advertisement.findMany({
    where: { companyId: company.id },
    include: { category: true },
    orderBy: { startDate: "desc" },
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">광고 관리</h1>
      <p className="mt-1 text-sm text-neutral-500">
        CPT(기간) 방식으로 카테고리별 상위 3개 슬롯에 노출돼요. 아직 실제
        결제는 연동되지 않았어요.
      </p>

      {company.status !== "ACTIVE" ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          승인된 업체만 광고를 신청할 수 있어요. 관리자 승인을 기다려주세요.
        </p>
      ) : company.services.length === 0 ? (
        <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          먼저 서비스를 하나 이상 등록해야 광고를 신청할 수 있어요.
        </p>
      ) : (
        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">광고 신청</h2>
          <ApplyAdForm services={company.services} todayStr={todayStr} />
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">내 광고</h2>
        {ads.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            아직 신청한 광고가 없어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {ads.map((ad) => {
              const status = getAdStatus(ad);
              return (
                <li
                  key={ad.id}
                  className="rounded-lg border border-neutral-100 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">
                      {ad.category.name} · {ad.slot}번 슬롯
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${AD_STATUS_BADGE_CLASS[status]}`}
                    >
                      {AD_STATUS_LABEL[status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {ad.startDate.toLocaleDateString("ko-KR")} ~{" "}
                    {ad.endDate.toLocaleDateString("ko-KR")} ·{" "}
                    {ad.pricePerDay.toLocaleString()}원/일
                  </p>
                  {(status === "SCHEDULED" || status === "ACTIVE") && (
                    <form action={cancelAd} className="mt-2">
                      <input type="hidden" name="adId" value={ad.id} />
                      <SubmitButton
                        className="text-xs text-neutral-400 underline"
                        pendingText="취소 중..."
                      >
                        광고 취소
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
