import { requireUser } from "@/lib/session";
import { getMonthReport, getDayMeals } from "@/lib/reports";
import { resolveMonthParam, listExistingMonths, currentYearMonth, getOrCreateMonth } from "@/lib/month";
import { formatMonthLabel, toDateInputValue } from "@/lib/utils";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PersonCard } from "@/components/dashboard/PersonCard";
import { SettlementBanner } from "@/components/dashboard/SettlementBanner";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MealTrendChart } from "@/components/dashboard/MealTrendChart";
import { MealSlotCard } from "@/components/meals/MealSlotCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const user = await requireUser();
  const { year, month } = resolveMonthParam(searchParams.m);

  const [report, existingMonths] = await Promise.all([getMonthReport(year, month), listExistingMonths()]);

  const todayStr = toDateInputValue(new Date());
  const { year: curYear, month: curMonth } = currentYearMonth();
  const [todaySlots, todayMonth] = await Promise.all([
    getDayMeals(todayStr),
    curYear === year && curMonth === month ? Promise.resolve(report.month) : getOrCreateMonth(curYear, curMonth),
  ]);
  const todayEditable = todayMonth.status === "OPEN" || user.role === "ADMIN";

  const nameById = new Map(report.users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">{formatMonthLabel(year, month)}</p>
        </div>
        <MonthSwitcher year={year} month={month} availableMonths={existingMonths} />
      </div>

      <SummaryCards summary={report.summary} />

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Meals</h2>
          <Link href="/meals" className="flex items-center gap-1 text-xs font-medium text-brand-600">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {todaySlots.map((slot) => (
            <MealSlotCard
              key={slot.mealType}
              date={todayStr}
              slot={slot}
              currentUserId={user.id}
              isAdmin={user.role === "ADMIN"}
              guestEditable={todayEditable}
              mealEditable={todayEditable}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-slate-900">Who Owes / Who Receives</h2>
        <SettlementBanner transfers={report.settlement} nameById={nameById} />
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-slate-900">Per-Person Summary</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {report.summary.people.map((person) => (
            <PersonCard key={person.userId} name={nameById.get(person.userId) ?? "Unknown"} person={person} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Expense Breakdown</h2>
          <CategoryChart data={report.categoryBreakdown} />
        </section>
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Daily Meals This Month</h2>
          <MealTrendChart data={report.dailyMealTrend} />
        </section>
      </div>
    </div>
  );
}
