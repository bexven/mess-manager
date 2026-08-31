"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError } from "@/lib/session";
import { assertMonthEditable } from "@/lib/month";
import { writeAuditLog } from "@/lib/audit";
import { toggleMealSchema, setGuestMealSchema } from "@/lib/validation";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { dateOnlyFromString, formatDayLabel, isWithinMealEditWindow, MEAL_EDIT_WINDOW_DAYS } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function toggleMeal(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = toggleMealSchema.parse(input);

    if (parsed.userId !== user.id && user.role !== "ADMIN") {
      throw new ForbiddenError("You can only update your own meals.");
    }

    if (user.role !== "ADMIN" && !isWithinMealEditWindow(parsed.date)) {
      throw new ForbiddenError(
        `This meal is more than ${MEAL_EDIT_WINDOW_DAYS} days old and can no longer be changed. Ask an admin if this needs correcting.`,
      );
    }

    const date = dateOnlyFromString(parsed.date);
    const [year, month] = [date.getUTCFullYear(), date.getUTCMonth() + 1];
    const monthRecord = await assertMonthEditable(year, month, user.role === "ADMIN");

    const existing = await prisma.mealEntry.findUnique({
      where: { date_mealType_userId: { date, mealType: parsed.mealType, userId: parsed.userId } },
    });

    const targetUser = await prisma.user.findUniqueOrThrow({ where: { id: parsed.userId } });

    const entry = await prisma.mealEntry.upsert({
      where: { date_mealType_userId: { date, mealType: parsed.mealType, userId: parsed.userId } },
      update: { ate: parsed.ate, updatedById: user.id },
      create: {
        date,
        mealType: parsed.mealType,
        userId: parsed.userId,
        ate: parsed.ate,
        monthId: monthRecord.id,
        updatedById: user.id,
      },
    });

    const describeAte = (ate: boolean | null | undefined) =>
      ate === true ? "Ate" : ate === false ? "Did not eat" : "Not updated yet";
    const oldValue = describeAte(existing?.ate);
    const newValue = describeAte(parsed.ate);

    if (oldValue !== newValue) {
      await writeAuditLog({
        entityType: "MEAL",
        entityId: entry.id,
        action: existing ? "UPDATE" : "CREATE",
        changedById: user.id,
        field: "ate",
        oldValue,
        newValue,
        summary: `${formatDayLabel(date)} ${MEAL_TYPE_LABELS[parsed.mealType]} — ${targetUser.name}: ${oldValue} -> ${newValue}`,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/meals");
    revalidatePath("/report");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function setGuestMeal(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = setGuestMealSchema.parse(input);

    const date = dateOnlyFromString(parsed.date);
    const [year, month] = [date.getUTCFullYear(), date.getUTCMonth() + 1];
    const monthRecord = await assertMonthEditable(year, month, user.role === "ADMIN");

    const existing = await prisma.guestMeal.findUnique({
      where: { date_mealType: { date, mealType: parsed.mealType } },
    });

    const guestMeal = await prisma.guestMeal.upsert({
      where: { date_mealType: { date, mealType: parsed.mealType } },
      update: { count: parsed.count, note: parsed.note ?? null, addedById: user.id },
      create: {
        date,
        mealType: parsed.mealType,
        count: parsed.count,
        note: parsed.note ?? null,
        monthId: monthRecord.id,
        addedById: user.id,
      },
    });

    const oldCount = existing?.count ?? 0;
    if (oldCount !== parsed.count) {
      await writeAuditLog({
        entityType: "GUEST_MEAL",
        entityId: guestMeal.id,
        action: existing ? "UPDATE" : "CREATE",
        changedById: user.id,
        field: "count",
        oldValue: String(oldCount),
        newValue: String(parsed.count),
        summary: `${formatDayLabel(date)} ${MEAL_TYPE_LABELS[parsed.mealType]} — Guest meals: ${oldCount} -> ${parsed.count}`,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/meals");
    revalidatePath("/report");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
