import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateMonth, resolveMonthParam, listExistingMonths } from "@/lib/month";
import { getActiveCategories, getActiveUsersLite } from "@/lib/categories";
import { formatMonthLabel } from "@/lib/utils";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ExpenseManager, type ExpenseRow } from "@/components/expenses/ExpenseManager";

export default async function ExpensesPage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await requireUser();
  const { year, month } = resolveMonthParam(searchParams.m);

  const [monthRecord, existingMonths, categories, users] = await Promise.all([
    getOrCreateMonth(year, month),
    listExistingMonths(),
    getActiveCategories(),
    getActiveUsersLite(),
  ]);

  const expenses = await prisma.expense.findMany({
    where: { monthId: monthRecord.id },
    include: { category: true, paidBy: true },
    orderBy: { date: "desc" },
  });

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    amount: Number(e.amount),
    categoryId: e.categoryId,
    categoryName: e.category.name,
    description: e.description,
    paidById: e.paidById,
    paidByName: e.paidBy.name,
    countsTowardMealCost: e.countsTowardMealCost,
    note: e.note,
  }));

  const monthEditable = monthRecord.status === "OPEN" || user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">{formatMonthLabel(year, month)}</p>
        </div>
        <MonthSwitcher year={year} month={month} availableMonths={existingMonths} />
      </div>

      {!monthEditable && (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          This month is closed. Only an admin can add or edit expenses.
        </div>
      )}

      <ExpenseManager
        expenses={rows}
        categories={categories}
        users={users}
        currentUserId={user.id}
        isAdmin={user.role === "ADMIN"}
        monthEditable={monthEditable}
      />
    </div>
  );
}
