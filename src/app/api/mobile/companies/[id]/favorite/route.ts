import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";

/** Mobile equivalent of the web toggleFavorite Server Action. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: companyId } = await params;

  const existing = await prisma.favorite.findUnique({
    where: { customerId_companyId: { customerId: userId, companyId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ isFavorited: false });
  }

  // Re-derive that the company actually exists rather than trusting the
  // client-supplied id blindly — a crafted id would otherwise create a
  // dangling favorite row.
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "존재하지 않는 업체입니다." }, { status: 404 });
  }
  await prisma.favorite.create({ data: { customerId: userId, companyId } });
  return NextResponse.json({ isFavorited: true });
}
