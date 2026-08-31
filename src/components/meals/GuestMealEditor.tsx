"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";
import { setGuestMeal } from "@/app/actions/meals";

export function GuestMealEditor({
  date,
  mealType,
  initialCount,
  editable,
}: {
  date: string;
  mealType: "LUNCH" | "DINNER";
  initialCount: number;
  editable: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function commit(next: number) {
    if (!editable || next < 0) return;
    const previous = count;
    setCount(next);
    setError(null);
    startTransition(async () => {
      const result = await setGuestMeal({ date, mealType, count: next });
      if (!result.ok) {
        setCount(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-2.5">
      <span className="text-sm font-medium text-slate-500">Guests</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-500">{error}</span>}
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        <div className="inline-flex items-center gap-3 rounded-lg border border-slate-200 px-1">
          <button
            type="button"
            disabled={!editable || count <= 0}
            onClick={() => commit(count - 1)}
            className="flex h-8 w-8 items-center justify-center text-slate-500 disabled:opacity-30"
            aria-label="Decrease guest meals"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-sm font-semibold tabular-nums text-slate-800">{count}</span>
          <button
            type="button"
            disabled={!editable}
            onClick={() => commit(count + 1)}
            className="flex h-8 w-8 items-center justify-center text-slate-500 disabled:opacity-30"
            aria-label="Increase guest meals"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
