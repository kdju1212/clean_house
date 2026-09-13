import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Mobile equivalent of the category grid on the web home page. */
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  });
}
