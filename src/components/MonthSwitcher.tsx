"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel, monthKey } from "@/lib/utils";

export function MonthSwitcher({
  year,
  month,
  availableMonths,
}: {
  year: number;
  month: number;
  /** All months that exist in the DB, newest first, for the dropdown. */
  availableMonths: { year: number; month: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(y: number, m: number) {
    const normY = m > 12 ? y + 1 : m < 1 ? y - 1 : y;
    const normM = m > 12 ? 1 : m < 1 ? 12 : m;
    router.push(`${pathname}?m=${monthKey(normY, normM)}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        aria-label="Previous month"
        onClick={() => goTo(year, month - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <select
        value={monthKey(year, month)}
        onChange={(e) => router.push(`${pathname}?m=${e.target.value}`)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800"
      >
        {availableMonths.some((am) => am.year === year && am.month === month) ? null : (
          <option value={monthKey(year, month)}>{formatMonthLabel(year, month)}</option>
        )}
        {availableMonths.map((am) => (
          <option key={monthKey(am.year, am.month)} value={monthKey(am.year, am.month)}>
            {formatMonthLabel(am.year, am.month)}
          </option>
        ))}
      </select>
      <button
        aria-label="Next month"
        onClick={() => goTo(year, month + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
