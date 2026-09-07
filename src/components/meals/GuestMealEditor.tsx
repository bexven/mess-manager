"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";
import { setGuestMeal } from "@/app/actions/meals";

export function GuestMealEditor({
  date,
  mealType,
  hostUserId,
  initialCount,
  editable,
}: {
  date: string;
  mealType: "LUNCH" | "DINNER";
  /** Which person this guest meal is billed to. */
  hostUserId: string;
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
      const result = await setGuestMeal({ date, mealType, hostUserId, count: next });
      if (!result.ok) {
        setCount(previous);
        setError(result.error);
      }
    });
  }

  if (!editable && count === 0) return null;

  return (
    <div className="ml-1 flex items-center justify-between gap-3 pt-1">
      <span className="text-xs text-slate-400">their guests</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-500">{error}</span>}
        {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-1">
          <button
            type="button"
            disabled={!editable || count <= 0}
            onClick={() => commit(count - 1)}
            className="flex h-6 w-6 items-center justify-center text-slate-500 disabled:opacity-30"
            aria-label="Decrease guest meals"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-4 text-center text-xs font-semibold tabular-nums text-slate-700">{count}</span>
          <button
            type="button"
            disabled={!editable}
            onClick={() => commit(count + 1)}
            className="flex h-6 w-6 items-center justify-center text-slate-500 disabled:opacity-30"
            aria-label="Increase guest meals"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
