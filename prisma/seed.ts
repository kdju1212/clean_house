import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = [
  { slug: "move-in", name: "입주청소" },
  { slug: "moving", name: "이사청소" },
  { slug: "residential", name: "거주청소" },
  { slug: "office", name: "사무실청소" },
  { slug: "restaurant", name: "식당청소" },
  { slug: "store", name: "상가청소" },
  { slug: "aircon", name: "에어컨청소" },
  { slug: "washer", name: "세탁기청소" },
  { slug: "etc", name: "기타청소" },
];

// Legacy flat regions predating the SIDO -> SIGUNGU -> EUPMYEONDONG
// hierarchy below. Left completely untouched (still parentId: null,
// level: EUPMYEONDONG by column default) so existing CompanyRegion rows
// pointing at them keep working — see the region_hierarchy migration.
const legacyFlatRegions = [
  "화성시 동탄동",
  "화성시 병점동",
  "화성시 남양읍",
  "화성시 향남읍",
  "화성시 봉담읍",
];

// New hierarchical region tree. A company can link to a region at any
// level — linking to a SIGUNGU (e.g. "수원시 영통구 전체") is treated by
// the search/reservation matching logic as covering every EUPMYEONDONG
// underneath it, without needing to also store a row per child.
//
// Sourced from the 행정안전부 법정동코드 전체자료 (전국, "존재" 상태만):
// generated into regions-nationwide.json by filtering out 폐지 rows and
// 리 단위 (rural sub-divisions), and collapsing 시/군/구 containers that
// have no directly addressable 읍/면/동 of their own (e.g. a 시 that has
// since been split entirely into 구). 세종특별자치시 has no 구 layer at
// all, so it gets a synthetic SIGUNGU node with the same name as the
// SIDO so the tree stays a uniform 3 levels deep — see build script notes.
const regionTree: {
  name: string;
  children?: { name: string; children?: { name: string }[] }[];
}[] = JSON.parse(readFileSync(join(__dirname, "data/regions-nationwide.json"), "utf-8"));

// Can't use prisma.region.upsert()'s compound-unique shorthand here — the
// generated parentId_name key rejects a literal null, even though parentId
// itself is nullable (SIDO rows and the legacy flat regions have no
// parent). findFirst handles null in a plain where-filter fine, so look
// the row up that way and create/update manually instead.
async function upsertRegion(
  name: string,
  level: "SIDO" | "SIGUNGU" | "EUPMYEONDONG",
  parentId: string | null,
  order: number
) {
  const existing = await prisma.region.findFirst({ where: { parentId, name } });
  if (existing) {
    return prisma.region.update({ where: { id: existing.id }, data: { level, order } });
  }
  return prisma.region.create({ data: { name, level, parentId, order } });
}

async function seedRegionTree() {
  let count = 0;
  for (const [sidoIndex, sido] of regionTree.entries()) {
    const sidoRow = await upsertRegion(sido.name, "SIDO", null, sidoIndex);
    count++;
    for (const [sigunguIndex, sigungu] of (sido.children ?? []).entries()) {
      const sigunguRow = await upsertRegion(
        sigungu.name,
        "SIGUNGU",
        sidoRow.id,
        sigunguIndex
      );
      count++;
      for (const [dongIndex, dong] of (sigungu.children ?? []).entries()) {
        await upsertRegion(dong.name, "EUPMYEONDONG", sigunguRow.id, dongIndex);
        count++;
      }
    }
  }
  return count;
}

async function main() {
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, order: index },
      create: { ...category, order: index },
    });
  }

  for (const [index, name] of legacyFlatRegions.entries()) {
    await upsertRegion(name, "EUPMYEONDONG", null, index);
  }

  const hierarchicalCount = await seedRegionTree();

  console.log(
    `Seeded ${categories.length} categories, ${legacyFlatRegions.length} legacy regions, ${hierarchicalCount} hierarchical regions.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
