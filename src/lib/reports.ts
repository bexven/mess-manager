import "server-only";
import { prisma } from "@/lib/prisma";
import { getOrCreateMonth } from "@/lib/month";
import {
  calculateMonthlySummary,
  calculateSettlement,
  type MonthlySummary,
  type SettlementTransfer,
} from "@/lib/calculations";
import type { Month } from "@prisma/client";

export interface UserLite {
  id: string;
  name: string;
  active: boolean;
}

export interface MonthReport {
  month: Month;
  users: UserLite[];
  summary: MonthlySummary;
  settlement: SettlementTransfer[];
  categoryBreakdown: { category: string; amount: number }[];
  dailyMealTrend: { date: string; meals: number }[];
}

async function getUsersInvolvedInMonth(monthId: string): Promise<UserLite[]> {
  const [mealUserIds, expenseUserIds, activeUsers] = await Promise.all([
    prisma.mealEntry.findMany({ where: { monthId }, distinct: ["userId"], select: { userId: true } }),
    prisma.expense.findMany({
      where: { monthId },
      distinct: ["paidById"],
      select: { paidById: true },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, active: true } }),
  ]);

  const involvedIds = new Set<string>([
    ...mealUserIds.map((m) => m.userId),
    ...expenseUserIds.map((e) => e.paidById),
    ...activeUsers.map((u) => u.id),
  ]);

  if (involvedIds.size === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(involvedIds) } },
    select: { id: true, name: true, active: true },
    orderBy: { createdAt: "asc" },
  });

  return users;
}

export async function getMonthReport(year: number, month: number): Promise<MonthReport> {
  const monthRecord = await getOrCreateMonth(year, month);
  const users = await getUsersInvolvedInMonth(monthRecord.id);

  const [mealEntries, guestMeals, expenses] = await Promise.all([
    prisma.mealEntry.findMany({ where: { monthId: monthRecord.id } }),
    prisma.guestMeal.findMany({ where: { monthId: monthRecord.id } }),
    prisma.expense.findMany({
      where: { monthId: monthRecord.id },
      include: { category: true, paidBy: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const people = users.map((u) => ({
    userId: u.id,
    mealCount: mealEntries.filter((m) => m.userId === u.id && m.ate).length,
  }));

  const payments = users.map((u) => ({
    userId: u.id,
    totalPaid: expenses
      .filter((e) => e.paidById === u.id)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  }));

  const guestMealCount = guestMeals.reduce((sum, g) => sum + g.count, 0);
  const mealExpenseTotal = expenses
    .filter((e) => e.countsTowardMealCost)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const otherExpenseTotal = expenses
    .filter((e) => !e.countsTowardMealCost)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const summary = calculateMonthlySummary({
    people,
    payments,
    guestMealCount,
    mealExpenseTotal,
    otherExpenseTotal,
    activeUserCount: users.length,
  });

  const settlement = calculateSettlement(summary.people.map((p) => ({ userId: p.userId, balance: p.balance })));

  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category.name;
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + Number(e.amount));
  }
  const categoryBreakdown = Array.from(categoryTotals.entries()).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
  }));

  const mealsByDate = new Map<string, number>();
  for (const m of mealEntries) {
    if (!m.ate) continue;
    const key = m.date.toISOString().slice(0, 10);
    mealsByDate.set(key, (mealsByDate.get(key) ?? 0) + 1);
  }
  for (const g of guestMeals) {
    const key = g.date.toISOString().slice(0, 10);
    mealsByDate.set(key, (mealsByDate.get(key) ?? 0) + g.count);
  }
  const dailyMealTrend = Array.from(mealsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, meals]) => ({ date, meals }));

  return { month: monthRecord, users, summary, settlement, categoryBreakdown, dailyMealTrend };
}

export interface RecentDaySummary {
  date: string;
  lunchEaten: number;
  lunchGuests: number;
  dinnerEaten: number;
  dinnerGuests: number;
}

export async function getRecentDaysSummary(anchorDateStr: string, days = 10): Promise<RecentDaySummary[]> {
  const anchor = new Date(`${anchorDateStr}T00:00:00.000Z`);
  const start = new Date(anchor);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const [mealEntries, guestMeals] = await Promise.all([
    prisma.mealEntry.findMany({ where: { date: { gte: start, lte: anchor }, ate: true } }),
    prisma.guestMeal.findMany({ where: { date: { gte: start, lte: anchor } } }),
  ]);

  const results: RecentDaySummary[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);

    results.push({
      date: key,
      lunchEaten: mealEntries.filter((m) => m.mealType === "LUNCH" && m.date.toISOString().slice(0, 10) === key).length,
      dinnerEaten: mealEntries.filter((m) => m.mealType === "DINNER" && m.date.toISOString().slice(0, 10) === key).length,
      lunchGuests:
        guestMeals.find((g) => g.mealType === "LUNCH" && g.date.toISOString().slice(0, 10) === key)?.count ?? 0,
      dinnerGuests:
        guestMeals.find((g) => g.mealType === "DINNER" && g.date.toISOString().slice(0, 10) === key)?.count ?? 0,
    });
  }

  return results.reverse();
}

export interface DayMealSlot {
  mealType: "LUNCH" | "DINNER";
  entries: { userId: string; userName: string; ate: boolean | null; entryId: string }[];
  guestCount: number;
  guestNote: string | null;
}

export async function getDayMeals(dateStr: string): Promise<DayMealSlot[]> {
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const [mealEntries, guestMeals] = await Promise.all([
    prisma.mealEntry.findMany({
      where: { date },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { createdAt: "asc" } },
    }),
    prisma.guestMeal.findMany({ where: { date } }),
  ]);

  return (["LUNCH", "DINNER"] as const).map((mealType) => {
    const entries = mealEntries
      .filter((m) => m.mealType === mealType)
      .map((m) => ({ userId: m.userId, userName: m.user.name, ate: m.ate, entryId: m.id }));
    const guest = guestMeals.find((g) => g.mealType === mealType);
    return {
      mealType,
      entries,
      guestCount: guest?.count ?? 0,
      guestNote: guest?.note ?? null,
    };
  });
}
