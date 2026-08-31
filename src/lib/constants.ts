export const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "৳";

export const MEAL_TYPES = ["LUNCH", "DINNER"] as const;
export type MealTypeValue = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealTypeValue, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export const DEFAULT_CATEGORY_NAMES = [
  "Groceries",
  "Food",
  "Meat",
  "Fish",
  "Vegetables",
  "Rice",
  "Cooking/Gas",
  "Other",
];

export function formatCurrency(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(rounded));
  return `${rounded < 0 ? "-" : ""}${CURRENCY_SYMBOL}${formatted}`;
}
