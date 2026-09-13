"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { REGION_COOKIE } from "@/lib/region";
import { toActionError, type ActionState } from "@/lib/action-state";

export async function selectRegion(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const regionId = formData.get("regionId");
    if (typeof regionId !== "string" || regionId.length === 0) {
      throw new Error("지역을 선택해주세요.");
    }

    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      throw new Error("존재하지 않는 지역입니다.");
    }
    // Customers always browse at 동 granularity — a 시/도 or 시/군/구 id
    // here would be a client tampering with the submitted value, since the
    // form only ever renders leaf-level radio options.
    if (region.level !== "EUPMYEONDONG") {
      throw new Error("동 단위 지역만 선택할 수 있어요.");
    }

    const cookieStore = await cookies();
    cookieStore.set(REGION_COOKIE, region.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch (err) {
    return toActionError(err);
  }

  redirect("/");
}
