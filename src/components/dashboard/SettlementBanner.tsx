import { ArrowRight, PartyPopper } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { SettlementTransfer } from "@/lib/calculations";

export function SettlementBanner({
  transfers,
  nameById,
}: {
  transfers: SettlementTransfer[];
  nameById: Map<string, string>;
}) {
  if (transfers.length === 0) {
    return (
      <div className="card flex items-center gap-3 bg-brand-50/60">
        <PartyPopper className="h-5 w-5 text-brand-600" />
        <p className="text-sm font-medium text-brand-800">Everyone is settled up for this month.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Settlement</p>
      <ul className="space-y-2.5">
        {transfers.map((t, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <span>{nameById.get(t.fromUserId) ?? "Unknown"}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span>{nameById.get(t.toUserId) ?? "Unknown"}</span>
            </div>
            <span className="font-semibold text-brand-700">{formatCurrency(t.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
