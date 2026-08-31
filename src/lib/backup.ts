import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const BACKUP_SCHEMA_VERSION = 1;

const roleSchema = z.enum(["ADMIN", "USER"]);
const mealTypeSchema = z.enum(["LUNCH", "DINNER"]);
const monthStatusSchema = z.enum(["OPEN", "CLOSED"]);
const auditActionSchema = z.enum(["CREATE", "UPDATE", "DELETE"]);
const auditEntitySchema = z.enum(["MEAL", "GUEST_MEAL", "EXPENSE", "USER", "MONTH", "CATEGORY"]);

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  role: roleSchema,
  active: z.boolean(),
  avatarDataUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  isDefault: z.boolean(),
});

const monthSchema = z.object({
  id: z.string(),
  year: z.number(),
  month: z.number(),
  status: monthStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const mealEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  mealType: mealTypeSchema,
  userId: z.string(),
  ate: z.boolean().nullable(),
  monthId: z.string(),
  updatedAt: z.string(),
  updatedById: z.string().nullable(),
});

const guestMealSchema = z.object({
  id: z.string(),
  date: z.string(),
  mealType: mealTypeSchema,
  count: z.number(),
  note: z.string().nullable(),
  monthId: z.string(),
  addedById: z.string().nullable(),
  updatedAt: z.string(),
});

const expenseSchema = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.union([z.string(), z.number()]),
  categoryId: z.string(),
  description: z.string().nullable(),
  paidById: z.string(),
  countsTowardMealCost: z.boolean(),
  note: z.string().nullable(),
  monthId: z.string(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const auditLogSchema = z.object({
  id: z.string(),
  entityType: auditEntitySchema,
  entityId: z.string(),
  action: auditActionSchema,
  field: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  summary: z.string(),
  changedById: z.string(),
  changedAt: z.string(),
});

export const backupSchema = z.object({
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  exportedBy: z.string(),
  users: z.array(userSchema),
  categories: z.array(categorySchema),
  months: z.array(monthSchema),
  mealEntries: z.array(mealEntrySchema),
  guestMeals: z.array(guestMealSchema),
  expenses: z.array(expenseSchema),
  auditLogs: z.array(auditLogSchema),
});

export type BackupData = z.infer<typeof backupSchema>;

export async function buildBackup(exportedByName: string): Promise<BackupData> {
  const [users, categories, months, mealEntries, guestMeals, expenses, auditLogs] = await Promise.all([
    prisma.user.findMany(),
    prisma.category.findMany(),
    prisma.month.findMany(),
    prisma.mealEntry.findMany(),
    prisma.guestMeal.findMany(),
    prisma.expense.findMany(),
    prisma.auditLog.findMany(),
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: exportedByName,
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    categories,
    months: months.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    mealEntries: mealEntries.map((m) => ({
      ...m,
      date: m.date.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    guestMeals: guestMeals.map((g) => ({
      ...g,
      date: g.date.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })),
    expenses: expenses.map((e) => ({
      ...e,
      date: e.date.toISOString(),
      amount: e.amount.toString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    auditLogs: auditLogs.map((a) => ({
      ...a,
      changedAt: a.changedAt.toISOString(),
    })),
  };
}

export interface RestoreCounts {
  users: number;
  categories: number;
  months: number;
  mealEntries: number;
  guestMeals: number;
  expenses: number;
  auditLogs: number;
}

/**
 * Wipes every table and reloads it from `data`, inside one transaction so a
 * failure partway through rolls back instead of leaving a half-restored DB.
 * IDs are preserved from the backup (not regenerated) so relations stay intact.
 */
export async function restoreBackup(data: BackupData): Promise<RestoreCounts> {
  return prisma.$transaction(
    async (tx) => {
      // Children first, so foreign keys never point at an already-deleted row.
      await tx.auditLog.deleteMany();
      await tx.mealEntry.deleteMany();
      await tx.guestMeal.deleteMany();
      await tx.expense.deleteMany();
      await tx.category.deleteMany();
      await tx.month.deleteMany();
      await tx.user.deleteMany();

      // Parents first, mirroring the delete order in reverse.
      await tx.user.createMany({
        data: data.users.map((u) => ({
          ...u,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        })),
      });
      await tx.category.createMany({ data: data.categories });
      await tx.month.createMany({
        data: data.months.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        })),
      });
      await tx.mealEntry.createMany({
        data: data.mealEntries.map((m) => ({
          ...m,
          date: new Date(m.date),
          updatedAt: new Date(m.updatedAt),
        })),
      });
      await tx.guestMeal.createMany({
        data: data.guestMeals.map((g) => ({
          ...g,
          date: new Date(g.date),
          updatedAt: new Date(g.updatedAt),
        })),
      });
      await tx.expense.createMany({
        data: data.expenses.map((e) => ({
          ...e,
          date: new Date(e.date),
          amount: e.amount,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        })),
      });
      await tx.auditLog.createMany({
        data: data.auditLogs.map((a) => ({
          ...a,
          changedAt: new Date(a.changedAt),
        })),
      });

      return {
        users: data.users.length,
        categories: data.categories.length,
        months: data.months.length,
        mealEntries: data.mealEntries.length,
        guestMeals: data.guestMeals.length,
        expenses: data.expenses.length,
        auditLogs: data.auditLogs.length,
      };
    },
    { timeout: 60_000 },
  );
}
