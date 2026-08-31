"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Receipt } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ExpenseForm, type ExpenseFormValues } from "@/components/expenses/ExpenseForm";
import { deleteExpense } from "@/app/actions/expenses";
import { formatCurrency } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";

export interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string | null;
  paidById: string;
  paidByName: string;
  countsTowardMealCost: boolean;
  note: string | null;
}

export function ExpenseManager({
  expenses,
  categories,
  users,
  currentUserId,
  isAdmin,
  monthEditable,
}: {
  expenses: ExpenseRow[];
  categories: { id: string; name: string }[];
  users: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
  monthEditable: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseFormValues | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(row: ExpenseRow) {
    setEditing({
      id: row.id,
      date: row.date,
      amount: String(row.amount),
      categoryId: row.categoryId,
      description: row.description ?? "",
      paidById: row.paidById,
      countsTowardMealCost: row.countsTowardMealCost,
      note: row.note ?? "",
    });
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteExpense(id);
      setDeletingId(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Expenses ({expenses.length})</h2>
        {monthEditable && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <Receipt className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No expenses recorded for this month yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5 sm:hidden">
          {expenses.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{formatCurrency(e.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(e.date)} &middot; {e.categoryName}
                  </p>
                  {e.description && <p className="mt-0.5 text-sm text-slate-600">{e.description}</p>}
                </div>
                <span
                  className={cn(
                    "badge shrink-0",
                    e.countsTowardMealCost ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {e.countsTowardMealCost ? "Meal cost" : "Other"}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-xs text-slate-500">Paid by {e.paidByName}</span>
                {isAdmin && monthEditable && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={pending && deletingId === e.id}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                    >
                      {pending && deletingId === e.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {expenses.length > 0 && (
        <div className="card hidden overflow-x-auto p-0 sm:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Paid by</th>
                <th className="px-4 py-2.5 font-medium">Meal cost?</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-2.5 text-slate-800">{e.categoryName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.description || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.paidByName}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "badge",
                        e.countsTowardMealCost ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {e.countsTowardMealCost ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatCurrency(e.amount)}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      {monthEditable && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(e)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={pending && deletingId === e.id}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                          >
                            {pending && deletingId === e.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Edit Expense" : "Add Expense"}>
        <ExpenseForm
          categories={categories}
          users={users}
          currentUserId={currentUserId}
          initial={editing}
          onDone={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  );
}
