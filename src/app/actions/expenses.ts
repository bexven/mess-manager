"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { assertMonthEditable } from "@/lib/month";
import { writeAuditLog, writeFieldDiffAudit } from "@/lib/audit";
import { expenseInputSchema, updateExpenseSchema } from "@/lib/validation";
import { formatCurrency } from "@/lib/constants";
import { formatDate, dateOnlyFromString } from "@/lib/utils";
import type { ActionResult } from "@/app/actions/meals";

export async function createExpense(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = expenseInputSchema.parse(input);

    const date = dateOnlyFromString(parsed.date);
    const [year, month] = [date.getUTCFullYear(), date.getUTCMonth() + 1];
    const monthRecord = await assertMonthEditable(year, month, user.role === "ADMIN");

    const [payer, category] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: parsed.paidById } }),
      prisma.category.findUniqueOrThrow({ where: { id: parsed.categoryId } }),
    ]);

    const expense = await prisma.expense.create({
      data: {
        date,
        amount: parsed.amount,
        categoryId: parsed.categoryId,
        description: parsed.description || null,
        paidById: parsed.paidById,
        countsTowardMealCost: parsed.countsTowardMealCost,
        note: parsed.note || null,
        monthId: monthRecord.id,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      entityType: "EXPENSE",
      entityId: expense.id,
      action: "CREATE",
      changedById: user.id,
      summary: `${formatDate(date)} — ${category.name} expense of ${formatCurrency(parsed.amount)} added (paid by ${payer.name})`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/report");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Only admins may edit an existing expense — regular users can add expenses but not modify them. */
export async function updateExpense(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = updateExpenseSchema.parse(input);

    const existing = await prisma.expense.findUniqueOrThrow({
      where: { id: parsed.id },
      include: { category: true, paidBy: true },
    });

    const newDate = dateOnlyFromString(parsed.date);
    const [year, month] = [newDate.getUTCFullYear(), newDate.getUTCMonth() + 1];
    const monthRecord = await assertMonthEditable(year, month, true);

    const [newPayer, newCategory] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: parsed.paidById } }),
      prisma.category.findUniqueOrThrow({ where: { id: parsed.categoryId } }),
    ]);

    const before = {
      date: formatDate(existing.date),
      amount: Number(existing.amount).toFixed(2),
      category: existing.category.name,
      description: existing.description ?? "",
      paidBy: existing.paidBy.name,
      countsTowardMealCost: existing.countsTowardMealCost ? "Yes" : "No",
      note: existing.note ?? "",
    };
    const after = {
      date: formatDate(newDate),
      amount: parsed.amount.toFixed(2),
      category: newCategory.name,
      description: parsed.description ?? "",
      paidBy: newPayer.name,
      countsTowardMealCost: parsed.countsTowardMealCost ? "Yes" : "No",
      note: parsed.note ?? "",
    };

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: parsed.id },
        data: {
          date: newDate,
          amount: parsed.amount,
          categoryId: parsed.categoryId,
          description: parsed.description || null,
          paidById: parsed.paidById,
          countsTowardMealCost: parsed.countsTowardMealCost,
          note: parsed.note || null,
          monthId: monthRecord.id,
        },
      });

      await writeFieldDiffAudit({
        entityType: "EXPENSE",
        entityId: parsed.id,
        changedById: admin.id,
        before,
        after,
        fieldLabels: {
          date: "Date",
          amount: "Amount",
          category: "Category",
          description: "Description",
          paidBy: "Paid by",
          countsTowardMealCost: "Counts toward meal cost",
          note: "Note",
        },
        summaryPrefix: `Expense on ${formatDate(existing.date)}`,
        tx,
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/report");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Only admins may delete an expense. The full record is written to the audit log before removal. */
export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const existing = await prisma.expense.findUniqueOrThrow({
      where: { id },
      include: { category: true, paidBy: true },
    });

    await assertMonthEditable(existing.date.getUTCFullYear(), existing.date.getUTCMonth() + 1, true);

    await prisma.$transaction(async (tx) => {
      await writeAuditLog(
        {
          entityType: "EXPENSE",
          entityId: id,
          action: "DELETE",
          changedById: admin.id,
          summary: `${formatDate(existing.date)} — ${existing.category.name} expense of ${formatCurrency(
            Number(existing.amount),
          )} (paid by ${existing.paidBy.name}) was deleted`,
          oldValue: JSON.stringify({
            date: existing.date.toISOString(),
            amount: existing.amount.toString(),
            category: existing.category.name,
            paidBy: existing.paidBy.name,
            countsTowardMealCost: existing.countsTowardMealCost,
            description: existing.description,
          }),
        },
        tx,
      );
      await tx.expense.delete({ where: { id } });
    });

    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/report");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
