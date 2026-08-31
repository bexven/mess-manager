import { requireUser } from "@/lib/session";
import { getMonthReport } from "@/lib/reports";
import { resolveMonthParam, listExistingMonths } from "@/lib/month";
import { formatMonthLabel, cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/constants";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { SettlementBanner } from "@/components/dashboard/SettlementBanner";

export default async function ReportPage({ searchParams }: { searchParams: { m?: string } }) {
  await requireUser();
  const { year, month } = resolveMonthParam(searchParams.m);

  const [report, existingMonths] = await Promise.all([getMonthReport(year, month), listExistingMonths()]);
  const { summary } = report;
  const nameById = new Map(report.users.map((u) => [u.id, u.name]));

  const statTiles = [
    { label: "Total Meals", value: summary.totalMeals.toLocaleString() },
    { label: "Guest Meals", value: summary.guestMealCount.toLocaleString() },
    { label: "Meal Expenses", value: formatCurrency(summary.mealExpenseTotal) },
    { label: "Avg Meal Cost", value: formatCurrency(summary.mealCost) },
    { label: "Other Expenses", value: formatCurrency(summary.otherExpenseTotal) },
    { label: "Total Expenses", value: formatCurrency(summary.totalExpenseAmount) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Monthly Report</h1>
          <p className="text-sm text-slate-500">
            {formatMonthLabel(year, month)} &middot;{" "}
            <span className={cn("font-medium", report.month.status === "OPEN" ? "text-brand-600" : "text-slate-500")}>
              {report.month.status === "OPEN" ? "Open" : "Closed"}
            </span>
          </p>
        </div>
        <MonthSwitcher year={year} month={month} availableMonths={existingMonths} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statTiles.map((t) => (
          <div key={t.label} className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{t.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-slate-900">Per-Person Breakdown</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-4 py-2.5 font-medium">Meals</th>
                <th className="px-4 py-2.5 font-medium">Meal Cost</th>
                <th className="px-4 py-2.5 font-medium">Other Share</th>
                <th className="px-4 py-2.5 font-medium">Total Cost</th>
                <th className="px-4 py-2.5 font-medium">Paid</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {summary.people.map((p) => {
                const isPositive = p.balance > 0.004;
                const isNegative = p.balance < -0.004;
                return (
                  <tr key={p.userId} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{nameById.get(p.userId) ?? "Unknown"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.mealCount}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(p.personalMealCost)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(p.otherExpenseShare)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(p.totalCost)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(p.totalPaid)}</td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold",
                        isPositive && "text-brand-600",
                        isNegative && "text-red-600",
                      )}
                    >
                      {isPositive ? "+" : isNegative ? "-" : ""}
                      {formatCurrency(Math.abs(p.balance))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-slate-900">Settlement</h2>
        <SettlementBanner transfers={report.settlement} nameById={nameById} />
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-slate-900">Expense Breakdown by Category</h2>
        <div className="card">
          {report.categoryBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No expenses recorded this month.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {report.categoryBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map((c) => (
                  <li key={c.category} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-700">{c.category}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
