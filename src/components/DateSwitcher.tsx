"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toDateInputValue } from "@/lib/utils";

export function DateSwitcher({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(value: string) {
    router.push(`${pathname}?d=${value}`);
  }

  function shift(days: number) {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    goTo(toDateInputValue(d));
  }

  const isToday = date === toDateInputValue(new Date());

  return (
    <div className="flex items-center gap-1.5">
      <button
        aria-label="Previous day"
        onClick={() => shift(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800"
      />
      {!isToday && (
        <button
          onClick={() => goTo(toDateInputValue(new Date()))}
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
        >
          Today
        </button>
      )}
      <button
        aria-label="Next day"
        onClick={() => shift(1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
