"use client";

import { useState, useTransition } from "react";
import { Check, X, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleMeal } from "@/app/actions/meals";

export function MealToggleButton({
  date,
  mealType,
  userId,
  userName,
  initialAte,
  editable,
}: {
  date: string;
  mealType: "LUNCH" | "DINNER";
  userId: string;
  userName: string;
  /** null = the member hasn't updated this meal yet (shown as a distinct yellow "pending" state). */
  initialAte: boolean | null;
  editable: boolean;
}) {
  const [ate, setAte] = useState<boolean | null>(initialAte);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSet(next: boolean | null) {
    if (!editable || pending || next === ate) return;
    const previous = ate;
    setAte(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleMeal({ date, mealType, userId, ate: next });
      if (!result.ok) {
        setAte(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="truncate text-sm font-medium text-slate-800">{userName}</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-500">{error}</span>}
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            disabled={!editable}
            onClick={() => handleSet(true)}
            className={cn(
              "flex h-9 w-10 items-center justify-center transition disabled:opacity-40",
              ate === true ? "bg-brand-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50",
            )}
            aria-label={`${userName} ate`}
            aria-pressed={ate === true}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!editable}
            onClick={() => handleSet(null)}
            title="Not updated yet"
            className={cn(
              "flex h-9 w-10 items-center justify-center border-l border-slate-200 transition disabled:opacity-40",
              ate === null ? "bg-amber-400 text-white" : "bg-white text-slate-400 hover:bg-slate-50",
            )}
            aria-label={`${userName} hasn't updated this meal yet`}
            aria-pressed={ate === null}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!editable}
            onClick={() => handleSet(false)}
            className={cn(
              "flex h-9 w-10 items-center justify-center border-l border-slate-200 transition disabled:opacity-40",
              ate === false ? "bg-red-500 text-white" : "bg-white text-slate-400 hover:bg-slate-50",
            )}
            aria-label={`${userName} did not eat`}
            aria-pressed={ate === false}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
