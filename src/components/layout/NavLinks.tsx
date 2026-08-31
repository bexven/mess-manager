"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Receipt, FileBarChart, History, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/report", label: "Report", icon: FileBarChart },
  { href: "/history", label: "History", icon: History },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="flex items-stretch justify-between">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-brand-600" : "text-slate-500",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
          M
        </div>
        <span className="text-lg font-semibold text-slate-900">Mess Manager</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
            {[
              { href: "/admin/users", label: "Users" },
              { href: "/admin/months", label: "Months" },
              { href: "/admin/categories", label: "Categories" },
              { href: "/admin/backup", label: "Backup" },
            ].map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <ShieldCheck className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
