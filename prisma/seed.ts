import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Groceries", isDefault: true },
  { name: "Food", isDefault: true },
  { name: "Meat", isDefault: true },
  { name: "Fish", isDefault: true },
  { name: "Vegetables", isDefault: true },
  { name: "Rice", isDefault: true },
  { name: "Cooking/Gas", isDefault: true },
  { name: "Other", isDefault: true },
];

async function main() {
  console.log("Seeding database...");

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  const adminName = process.env.SEED_ADMIN_NAME ?? "Sk Moni";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "skmoni@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change_me_immediately";

  const secondName = process.env.SEED_SECOND_USER_NAME ?? "Taufiq Uddin";
  const secondEmail = process.env.SEED_SECOND_USER_EMAIL ?? "taufiq@example.com";
  const secondPassword = process.env.SEED_SECOND_USER_PASSWORD ?? "change_me_immediately";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
      active: true,
    },
  });

  const secondUser = await prisma.user.upsert({
    where: { email: secondEmail },
    update: {},
    create: {
      name: secondName,
      email: secondEmail,
      passwordHash: await bcrypt.hash(secondPassword, 12),
      role: "USER",
      active: true,
    },
  });

  const now = new Date();
  const year = now.getUTCFullYear();
  const monthNum = now.getUTCMonth() + 1;
  const month = await prisma.month.upsert({
    where: { year_month: { year, month: monthNum } },
    update: {},
    create: { year, month: monthNum, status: "OPEN" },
  });

  // Mirrors generateMealEntriesForMonth() in src/lib/month.ts — kept as a
  // standalone copy here so this script has no dependency on path-alias
  // resolution under tsx. Idempotent (skipDuplicates), safe to re-run.
  const totalDays = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const activeUserIds = [admin.id, secondUser.id];
  const mealEntryRows: {
    date: Date;
    mealType: "LUNCH" | "DINNER";
    userId: string;
    monthId: string;
    ate: boolean | null;
  }[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(Date.UTC(year, monthNum - 1, day));
    for (const mealType of ["LUNCH", "DINNER"] as const) {
      for (const userId of activeUserIds) {
        mealEntryRows.push({ date, mealType, userId, monthId: month.id, ate: null });
      }
    }
  }
  await prisma.mealEntry.createMany({ data: mealEntryRows, skipDuplicates: true });

  console.log("Seed complete:");
  console.log(`  Admin: ${admin.email} (change password after first login!)`);
  console.log(`  User:  ${secondUser.email} (change password after first login!)`);
  console.log(`  Month: ${month.year}-${String(month.month).padStart(2, "0")} created as OPEN with meal entries for all ${totalDays} days`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
