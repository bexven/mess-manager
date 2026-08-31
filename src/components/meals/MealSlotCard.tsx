import { Sun, Moon } from "lucide-react";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { MealToggleButton } from "@/components/meals/MealToggleButton";
import { GuestMealEditor } from "@/components/meals/GuestMealEditor";
import type { DayMealSlot } from "@/lib/reports";

export function MealSlotCard({
  date,
  slot,
  currentUserId,
  isAdmin,
  guestEditable,
  mealEditable,
}: {
  date: string;
  slot: DayMealSlot;
  currentUserId: string;
  isAdmin: boolean;
  /** Whether the guest-meal counter can be edited (month open, or admin). */
  guestEditable: boolean;
  /** Whether the Ate/Did not eat toggles can be edited (month open AND within the edit window, or admin). */
  mealEditable: boolean;
}) {
  const Icon = slot.mealType === "LUNCH" ? Sun : Moon;
  const eatenCount = slot.entries.filter((e) => e.ate).length;

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-900">{MEAL_TYPE_LABELS[slot.mealType]}</h3>
        </div>
        <span className="badge bg-brand-50 text-brand-700">
          {eatenCount + slot.guestCount} meal{eatenCount + slot.guestCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {slot.entries.map((entry) => (
          <MealToggleButton
            key={entry.userId}
            date={date}
            mealType={slot.mealType}
            userId={entry.userId}
            userName={entry.userName}
            initialAte={entry.ate}
            editable={mealEditable && (isAdmin || entry.userId === currentUserId)}
          />
        ))}
      </div>
      <div className="mt-1">
        <GuestMealEditor
          date={date}
          mealType={slot.mealType}
          initialCount={slot.guestCount}
          editable={guestEditable}
        />
      </div>
    </div>
  );
}
