import { Utensils, Wallet, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { MonthlySummary } from "@/lib/calculations";

export function SummaryCards({ summary }: { summary: MonthlySummary }) {
  const items = [
    {
      label: "Total Meals",
      value: summary.totalMeals.toLocaleString(),
      sub: `${summary.totalPersonalMeals} member + ${summary.guestMealCount} guest`,
      icon: Utensils,
    },
    {
      label: "Meal Expenses",
      value: formatCurrency(summary.mealExpenseTotal),
      sub: `+ ${formatCurrency(summary.otherExpenseTotal)} other`,
      icon: Wallet,
    },
    {
      label: "Avg Cost / Meal",
      value: formatCurrency(summary.mealCost),
      sub: `${summary.totalMeals} meals this month`,
      icon: Calculator,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="card">
          <div className="mb-2 flex items-center gap-2 text-slate-400">
            <item.icon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}
