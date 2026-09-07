import { requireUser } from "@/lib/session";
import { getMonthReport, getDayMeals } from "@/lib/reports";
import { formatMonthLabel, formatDayLabel, toDateInputValue, isWithinMealEditWindow, MEAL_EDIT_WINDOW_DAYS } from "@/lib/utils";
import { DateSwitcher } from "@/components/DateSwitcher";
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
  searchParams: { d?: string };
}) {
  const user = await requireUser();
  const dateStr = searchParams.d && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d) ? searchParams.d : toDateInputValue(new Date());
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const isToday = dateStr === toDateInputValue(new Date());

  const [report, daySlots] = await Promise.all([getMonthReport(year, month), getDayMeals(dateStr)]);

  const isAdmin = user.role === "ADMIN";
  const monthOpen = report.month.status === "OPEN";
  const withinWindow = isWithinMealEditWindow(dateStr);
  const guestEditable = monthOpen || isAdmin;
  const mealEditable = (monthOpen && withinWindow) || isAdmin;

  const nameById = new Map(report.users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {formatMonthLabel(year, month)} &middot; {formatDayLabel(date)}
          </p>
        </div>
        <DateSwitcher date={dateStr} />
      </div>

      <SummaryCards summary={report.summary} />

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{isToday ? "Today's Meals" : "Meals"}</h2>
          <Link href="/meals" className="flex items-center gap-1 text-xs font-medium text-brand-600">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!monthOpen && !isAdmin && (
          <div className="mb-2.5 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            This month is closed. Only an admin can make changes.
          </div>
        )}
        {monthOpen && !withinWindow && !isAdmin && (
          <div className="mb-2.5 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            This day is more than {MEAL_EDIT_WINDOW_DAYS} days old, so meals can no longer be toggled. Guest counts
            can still be edited, and an admin can still change meals if needed.
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {daySlots.map((slot) => (
            <MealSlotCard
              key={`${dateStr}-${slot.mealType}`}
              date={dateStr}
              slot={slot}
              currentUserId={user.id}
              isAdmin={isAdmin}
              guestEditable={guestEditable}
              mealEditable={mealEditable}
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
