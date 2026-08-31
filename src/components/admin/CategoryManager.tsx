"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createCategory, setCategoryActive } from "@/app/actions/categories";
import { cn } from "@/lib/utils";

export interface CategoryRow {
  id: string;
  name: string;
  active: boolean;
  isDefault: boolean;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCategory({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function handleToggle(cat: CategoryRow) {
    setTogglingId(cat.id);
    startTransition(async () => {
      await setCategoryActive(cat.id, !cat.active);
      setTogglingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="card flex items-end gap-3">
        <div className="flex-1">
          <label className="label">New category</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Snacks" />
        </div>
        <button type="submit" disabled={pending || !name.trim()} className="btn-primary">
          {pending && !togglingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card divide-y divide-slate-100 p-0">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{c.name}</span>
              {c.isDefault && <span className="badge bg-slate-100 text-slate-500">Default</span>}
            </div>
            <button
              onClick={() => handleToggle(c)}
              disabled={pending && togglingId === c.id}
              className={cn("badge", c.active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500")}
            >
              {pending && togglingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : c.active ? "Active" : "Disabled"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
