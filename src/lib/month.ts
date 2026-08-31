import "server-only";
import { prisma } from "@/lib/prisma";
import type { Month } from "@prisma/client";

export class MonthClosedError extends Error {
  constructor(message = "This month is closed. Ask an admin to reopen it before editing.") {
    super(message);
    this.name = "MonthClosedError";
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Creates one MealEntry row per (day x LUNCH/DINNER x user) so every meal slot
 * has an explicit, auditable state instead of relying on "no row = didn't eat"
 * inference. New rows default to ate = null (a neutral "not updated yet" state,
 * shown distinctly from both Ate and Did not eat) until the member marks it.
 * Uses skipDuplicates so it's safe to call repeatedly (e.g. after adding a user).
 */
export async function generateMealEntriesForMonth(
  monthRecord: Month,
  userIds: string[],
  fromDay = 1,
): Promise<void> {
  if (userIds.length === 0) return;
  const totalDays = daysInMonth(monthRecord.year, monthRecord.month);
  const rows: {
    date: Date;
    mealType: "LUNCH" | "DINNER";
    userId: string;
    monthId: string;
    ate: boolean | null;
  }[] = [];

  for (let day = fromDay; day <= totalDays; day++) {
    const date = new Date(Date.UTC(monthRecord.year, monthRecord.month - 1, day));
    for (const mealType of ["LUNCH", "DINNER"] as const) {
      for (const userId of userIds) {
        rows.push({ date, mealType, userId, monthId: monthRecord.id, ate: null });
      }
    }
  }

  await prisma.mealEntry.createMany({ data: rows, skipDuplicates: true });
}

export async function getOrCreateMonth(year: number, month: number): Promise<Month> {
  const existing = await prisma.month.findUnique({ where: { year_month: { year, month } } });
  if (existing) return existing;

  const created = await prisma.month.create({ data: { year, month, status: "OPEN" } });
  const activeUsers = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
  await generateMealEntriesForMonth(created, activeUsers.map((u) => u.id));
  return created;
}

/** Ensures the month exists (creating it as OPEN if needed) and is not CLOSED, unless the actor is an admin. */
export async function assertMonthEditable(
  year: number,
  month: number,
  isAdmin: boolean,
): Promise<Month> {
  const monthRecord = await getOrCreateMonth(year, month);
  if (monthRecord.status === "CLOSED" && !isAdmin) {
    throw new MonthClosedError();
  }
  return monthRecord;
}

/** Resolves a "?m=YYYY-MM" search param into a year/month, defaulting to the current month. */
export function resolveMonthParam(m?: string): { year: number; month: number } {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [year, month] = m.split("-").map(Number);
    if (year && month && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  return currentYearMonth();
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export async function listExistingMonths(): Promise<Month[]> {
  return prisma.month.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] });
}
