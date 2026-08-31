"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const ENTITY_TYPES = [
  { value: "", label: "All types" },
  { value: "MEAL", label: "Meal" },
  { value: "GUEST_MEAL", label: "Guest Meal" },
  { value: "EXPENSE", label: "Expense" },
  { value: "USER", label: "User" },
  { value: "MONTH", label: "Month" },
  { value: "CATEGORY", label: "Category" },
];

export function HistoryFilters({
  users,
  initial,
}: {
  users: { id: string; name: string }[];
  initial: { changedById?: string; entityType?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initial);

  function apply(next: typeof filters) {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.changedById) params.set("user", next.changedById);
    if (next.entityType) params.set("type", next.entityType);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <label className="label">User</label>
        <select
          className="input"
          value={filters.changedById ?? ""}
          onChange={(e) => apply({ ...filters, changedById: e.target.value || undefined })}
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Type</label>
        <select
          className="input"
          value={filters.entityType ?? ""}
          onChange={(e) => apply({ ...filters, entityType: e.target.value || undefined })}
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">From</label>
        <input
          type="date"
          className="input"
          value={filters.from ?? ""}
          onChange={(e) => apply({ ...filters, from: e.target.value || undefined })}
        />
      </div>
      <div>
        <label className="label">To</label>
        <input
          type="date"
          className="input"
          value={filters.to ?? ""}
          onChange={(e) => apply({ ...filters, to: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
