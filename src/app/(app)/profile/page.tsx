import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMonthReport } from "@/lib/reports";
import { resolveMonthParam, listExistingMonths } from "@/lib/month";
import { formatMonthLabel } from "@/lib/utils";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { PersonCard } from "@/components/dashboard/PersonCard";
import { UserCircle } from "lucide-react";

export default async function ProfilePage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await requireUser();
  const { year, month } = resolveMonthParam(searchParams.m);

  const [dbUser, report, existingMonths] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { avatarDataUrl: true } }),
    getMonthReport(year, month),
    listExistingMonths(),
  ]);

  const person = report.summary.people.find((p) => p.userId === user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Manage your picture, password, and see your own monthly stats.</p>
      </div>

      <section className="card">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Your Info</h2>
        <AvatarUploader name={user.name} avatarDataUrl={dbUser.avatarDataUrl} />
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Name</p>
            <p className="font-medium text-slate-800">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="font-medium text-slate-800">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Role</p>
            <p className="font-medium text-slate-800">{user.role === "ADMIN" ? "Admin" : "Member"}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Need your name, email, or role changed? Ask an admin — that's managed from Admin → Users.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Change Password</h2>
        <ChangePasswordForm />
      </section>

      <section>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserCircle className="h-4 w-4 text-brand-600" /> Your Stats — {formatMonthLabel(year, month)}
          </h2>
          <MonthSwitcher year={year} month={month} availableMonths={existingMonths} />
        </div>
        {person ? (
          <PersonCard name={user.name} person={person} />
        ) : (
          <div className="card py-8 text-center text-sm text-slate-400">
            No meal or expense activity for you in {formatMonthLabel(year, month)}.
          </div>
        )}
      </section>
    </div>
  );
}
