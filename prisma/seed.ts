import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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

const regions = [
  "화성시 동탄동",
  "화성시 병점동",
  "화성시 남양읍",
  "화성시 향남읍",
  "화성시 봉담읍",
];

async function main() {
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, order: index },
      create: { ...category, order: index },
    });
  }

  for (const name of regions) {
    await prisma.region.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${categories.length} categories, ${regions.length} regions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
