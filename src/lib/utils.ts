import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a Date (or date-only ISO string) as "31 Aug 2026". */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Formats a Date as "31 August" (no year), used for daily meal rows. */
export function formatDayLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year: year ?? new Date().getUTCFullYear(), month: month ?? new Date().getUTCMonth() + 1 };
}

/** Returns a UTC-midnight Date for a "YYYY-MM-DD" string, avoiding local-timezone drift. */
export function dateOnlyFromString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export const MEAL_EDIT_WINDOW_DAYS = 5;

/**
 * True if `dateStr` (YYYY-MM-DD) is today, in the future, or within the last
 * MEAL_EDIT_WINDOW_DAYS days — the window during which a regular member may
 * still toggle their own meal for that day. Admins bypass this check entirely.
 */
export function isWithinMealEditWindow(dateStr: string, windowDays = MEAL_EDIT_WINDOW_DAYS): boolean {
  const today = dateOnlyFromString(toDateInputValue(new Date()));
  const target = dateOnlyFromString(dateStr);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays <= windowDays;
}
