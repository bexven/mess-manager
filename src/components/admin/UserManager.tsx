"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/Avatar";
import { createUser, updateUser } from "@/app/actions/users";
import { cn } from "@/lib/utils";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  active: boolean;
  avatarDataUrl?: string | null;
}

export function UserManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="card divide-y divide-slate-100 p-0">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={u.name} avatarDataUrl={u.avatarDataUrl} />
              <div>
                <p className="font-medium text-slate-900">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-slate-400">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("badge", u.role === "ADMIN" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600")}>
                {u.role === "ADMIN" ? "Admin" : "Member"}
              </span>
              <span className={cn("badge", u.active ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-600")}>
                {u.active ? "Active" : "Deactivated"}
              </span>
              <button
                onClick={() => {
                  setEditing(u);
                  setDialogOpen(true);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Edit User" : "Add User"}>
        <UserForm
          key={editing?.id ?? "new"}
          initial={editing}
          isSelf={editing?.id === currentUserId}
          onDone={() => {
            setDialogOpen(false);
            router.refresh();
          }}
        />
      </Dialog>
    </div>
  );
}

function UserForm({
  initial,
  isSelf,
  onDone,
}: {
  initial: UserRow | null;
  isSelf: boolean;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<"ADMIN" | "USER">(initial?.role ?? "USER");
  const [active, setActive] = useState(initial?.active ?? true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = initial
        ? await updateUser({ id: initial.id, name, email, role, active, password: password || undefined })
        : await createUser({ name, email, password, role });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">{initial ? "Reset password (optional)" : "Password"}</label>
        <input
          required={!initial}
          type="password"
          minLength={8}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={initial ? "Leave blank to keep current password" : undefined}
        />
      </div>
      <div>
        <label className="label">Role</label>
        <select
          className="input"
          value={role}
          disabled={isSelf}
          onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}
        >
          <option value="USER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {initial && (
        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5">
          <input
            type="checkbox"
            disabled={isSelf}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="text-sm text-slate-700">Active (can sign in)</span>
        </label>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Save changes" : "Add user"}
      </button>
    </form>
  );
}
