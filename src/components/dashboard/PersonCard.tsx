import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/constants";
import type { PersonSummary } from "@/lib/calculations";

export function PersonCard({ name, person }: { name: string; person: PersonSummary }) {
  const isPositive = person.balance > 0.004;
  const isNegative = person.balance < -0.004;

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {person.mealCount} meals &middot; Cost {formatCurrency(person.totalCost)}
          </p>
        </div>
        <span
          className={cn(
            "badge",
            isPositive && "bg-brand-50 text-brand-700",
            isNegative && "bg-red-50 text-red-600",
            !isPositive && !isNegative && "bg-slate-100 text-slate-600",
          )}
        >
          {isPositive ? "Should receive" : isNegative ? "Owes" : "Settled"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Paid</p>
          <p className="font-medium text-slate-800">{formatCurrency(person.totalPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">{isPositive ? "Receive" : "Due"}</p>
          <p className={cn("font-semibold", isPositive ? "text-brand-600" : isNegative ? "text-red-600" : "text-slate-800")}>
            {formatCurrency(Math.abs(person.balance))}
          </p>
        </div>
      </div>
    </div>
  );
}
