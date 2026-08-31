import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar, MobileNav } from "@/components/layout/NavLinks";
import { UserMenu } from "@/components/layout/UserMenu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  // Avatars are kept out of the JWT/session cookie (they can be sizeable data
  // URIs) and fetched fresh here instead.
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarDataUrl: true } });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isAdmin={isAdmin} />
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              M
            </div>
            <span className="font-semibold text-slate-900">Mess Manager</span>
          </div>
          <div className="hidden md:block" />
          <UserMenu name={user.name} role={user.role} isAdmin={isAdmin} avatarDataUrl={dbUser?.avatarDataUrl} />
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
