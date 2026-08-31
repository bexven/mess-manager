import { requireAdmin } from "@/lib/session";
import { AdminTabs } from "@/components/admin/AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500">Manage users, months, and expense categories.</p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
