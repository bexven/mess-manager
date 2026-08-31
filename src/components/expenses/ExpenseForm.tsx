"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import { toDateInputValue } from "@/lib/utils";

export interface ExpenseFormValues {
  id?: string;
  date: string;
  amount: string;
  categoryId: string;
  description: string;
  paidById: string;
  countsTowardMealCost: boolean;
  note: string;
}

export function ExpenseForm({
  categories,
  users,
  currentUserId,
  initial,
  onDone,
}: {
  categories: { id: string; name: string }[];
  users: { id: string; name: string }[];
  currentUserId: string;
  initial?: ExpenseFormValues;
  onDone: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ExpenseFormValues>(
    initial ?? {
      date: toDateInputValue(new Date()),
      amount: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      paidById: currentUserId,
      countsTowardMealCost: true,
      note: "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        date: values.date,
        amount: values.amount,
        categoryId: values.categoryId,
        description: values.description,
        paidById: values.paidById,
        countsTowardMealCost: values.countsTowardMealCost,
        note: values.note,
      };
      const result = values.id
        ? await updateExpense({ ...payload, id: values.id })
        : await createExpense(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            required
            className="input"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Amount</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            inputMode="decimal"
            className="input"
            value={values.amount}
            onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <select
          className="input"
          value={values.categoryId}
          onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <input
          type="text"
          className="input"
          maxLength={280}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </div>

      <div>
        <label className="label">Paid by</label>
        <select
          className="input"
          value={values.paidById}
          onChange={(e) => setValues((v) => ({ ...v, paidById: e.target.value }))}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          checked={values.countsTowardMealCost}
          onChange={(e) => setValues((v) => ({ ...v, countsTowardMealCost: e.target.checked }))}
        />
        <span className="text-sm text-slate-700">Counts toward meal cost</span>
      </label>

      <div>
        <label className="label">Note / receipt reference (optional)</label>
        <textarea
          className="input"
          rows={2}
          maxLength={1000}
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {values.id ? "Save changes" : "Add expense"}
      </button>
    </form>
  );
}
