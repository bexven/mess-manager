"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ChevronDown, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export function UserMenu({
  name,
  role,
  isAdmin,
  avatarDataUrl,
}: {
  name: string;
  role: string;
  isAdmin: boolean;
  avatarDataUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-slate-100"
      >
        <Avatar name={name} avatarDataUrl={avatarDataUrl} size="sm" />
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">{name}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5">
            <Avatar name={name} avatarDataUrl={avatarDataUrl} size="sm" />
            <div>
              <p className="text-sm font-medium text-slate-900">{name}</p>
              <p className="text-xs text-slate-500">{role === "ADMIN" ? "Admin" : "Member"}</p>
            </div>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <UserCircle className="h-4 w-4" /> Profile
          </Link>
          {isAdmin && (
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 md:hidden"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
