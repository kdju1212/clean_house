import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the web repo's /companies/[id]/report page — reports
 * the company itself (fraud, no-show, unfair charges, etc.), same Report
 * row (targetType COMPANY) an admin resolves at /admin/reports. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const reason = body?.reason;
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "신고 사유를 입력해주세요." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) {
    return NextResponse.json({ error: "존재하지 않는 업체예요." }, { status: 404 });
  }

  await prisma.report.create({
    data: {
      reporterId: userId,
      targetType: "COMPANY",
      targetId: company.id,
      reason: reason.trim().slice(0, 500),
    },
  });

  return NextResponse.json({ ok: true });
}
