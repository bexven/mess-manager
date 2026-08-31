import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDayMeals, getRecentDaysSummary } from "@/lib/reports";
import { getOrCreateMonth } from "@/lib/month";
import { toDateInputValue, formatDayLabel, cn, isWithinMealEditWindow, MEAL_EDIT_WINDOW_DAYS } from "@/lib/utils";
import { DateSwitcher } from "@/components/DateSwitcher";
import { MealSlotCard } from "@/components/meals/MealSlotCard";

export default async function MealsPage({ searchParams }: { searchParams: { d?: string } }) {
  const user = await requireUser();
  const dateStr = searchParams.d && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d) ? searchParams.d : toDateInputValue(new Date());
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const monthRecord = await getOrCreateMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  const isAdmin = user.role === "ADMIN";
  const monthOpen = monthRecord.status === "OPEN";
  const withinWindow = isWithinMealEditWindow(dateStr);
  const guestEditable = monthOpen || isAdmin;
  const mealEditable = (monthOpen && withinWindow) || isAdmin;

  const [slots, recentDays] = await Promise.all([getDayMeals(dateStr), getRecentDaysSummary(dateStr)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Meals</h1>
          <p className="text-sm text-slate-500">{formatDayLabel(date)}</p>
        </div>
        <DateSwitcher date={dateStr} />
      </div>

      {!monthOpen && !isAdmin && (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          This month is closed. Only an admin can make changes.
        </div>
      )}
      {monthOpen && !withinWindow && !isAdmin && (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          This day is more than {MEAL_EDIT_WINDOW_DAYS} days old, so meals can no longer be toggled. Guest counts
          can still be edited, and an admin can still change meals if needed.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <MealSlotCard
            key={slot.mealType}
            date={dateStr}
            slot={slot}
            currentUserId={user.id}
            isAdmin={isAdmin}
            guestEditable={guestEditable}
            mealEditable={mealEditable}
          />
        ))}
      </div>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-slate-900">Recent Days</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Lunch</th>
                <th className="px-4 py-2.5 font-medium">Dinner</th>
              </tr>
            </thead>
            <tbody>
              {recentDays.map((day) => (
                <tr key={day.date} className={cn("border-b border-slate-50 last:border-0", day.date === dateStr && "bg-brand-50/50")}>
                  <td className="px-4 py-2.5">
                    <Link href={`/meals?d=${day.date}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {formatDayLabel(day.date)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {day.lunchEaten} {day.lunchGuests > 0 && <span className="text-slate-400">+ {day.lunchGuests} guest</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {day.dinnerEaten} {day.dinnerGuests > 0 && <span className="text-slate-400">+ {day.dinnerGuests} guest</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
