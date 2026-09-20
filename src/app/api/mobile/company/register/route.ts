import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { createCompanyForOwner } from "@/lib/company-profile-service";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the web register-form's Server Action — same
 * shared validation/create core (see createCompanyForOwner). */
export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    await createCompanyForOwner(userId, {
      name: body?.name,
      phone: body?.phone,
      introText: body?.introText,
      businessHours: body?.businessHours,
      businessRegistrationNumber: body?.businessRegistrationNumber,
      representativeName: body?.representativeName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "등록에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // The caller's own local role cache needs updating too (see
  // updateStoredRole on the app side) — hand back the fresh company id so
  // it can navigate straight into /company instead of guessing.
  const company = await prisma.company.findUniqueOrThrow({ where: { ownerUserId: userId } });
  return NextResponse.json({ companyId: company.id });
}
