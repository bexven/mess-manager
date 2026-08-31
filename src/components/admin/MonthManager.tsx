"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { setMonthStatus } from "@/app/actions/months";
import { formatMonthLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface MonthRow {
  id: string;
  year: number;
  month: number;
  status: "OPEN" | "CLOSED";
}

export function MonthManager({ months }: { months: MonthRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(m: MonthRow) {
    setPendingId(m.id);
    startTransition(async () => {
      await setMonthStatus({ monthId: m.id, status: m.status === "OPEN" ? "CLOSED" : "OPEN" });
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="card divide-y divide-slate-100 p-0">
      {months.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-slate-900">{formatMonthLabel(m.year, m.month)}</span>
            <span className={cn("badge", m.status === "OPEN" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500")}>
              {m.status === "OPEN" ? "Open" : "Closed"}
            </span>
          </div>
          <button
            onClick={() => toggle(m)}
            disabled={pending && pendingId === m.id}
            className={m.status === "OPEN" ? "btn-secondary" : "btn-primary"}
          >
            {pending && pendingId === m.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : m.status === "OPEN" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <LockOpen className="h-3.5 w-3.5" />
            )}
            {m.status === "OPEN" ? "Close month" : "Reopen"}
          </button>
        </div>
      ))}
    </div>
  );
}
