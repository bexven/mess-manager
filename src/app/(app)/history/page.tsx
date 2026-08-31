import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getAuditLogs } from "@/lib/history";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import type { AuditEntity } from "@prisma/client";

const ENTITY_LABELS: Record<AuditEntity, string> = {
  MEAL: "Meal",
  GUEST_MEAL: "Guest Meal",
  EXPENSE: "Expense",
  USER: "User",
  MONTH: "Month",
  CATEGORY: "Category",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { user?: string; type?: string; from?: string; to?: string; page?: string };
}) {
  await requireUser();

  const users = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } });

  const page = Number(searchParams.page) || 1;
  const { logs, totalPages } = await getAuditLogs({
    changedById: searchParams.user,
    entityType: searchParams.type as AuditEntity | undefined,
    from: searchParams.from,
    to: searchParams.to,
    page,
  });

  const query = new URLSearchParams();
  if (searchParams.user) query.set("user", searchParams.user);
  if (searchParams.type) query.set("type", searchParams.type);
  if (searchParams.from) query.set("from", searchParams.from);
  if (searchParams.to) query.set("to", searchParams.to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">History</h1>
        <p className="text-sm text-slate-500">Every change to meals, expenses, and settings — who, what, when.</p>
      </div>

      <HistoryFilters
        users={users}
        initial={{
          changedById: searchParams.user,
          entityType: searchParams.type,
          from: searchParams.from,
          to: searchParams.to,
        }}
      />

      {logs.length === 0 ? (
        <div className="card py-10 text-center text-sm text-slate-400">No activity matches these filters.</div>
      ) : (
        <ul className="space-y-2.5">
          {logs.map((log) => (
            <li key={log.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-800">{log.summary}</p>
                <span className="badge shrink-0 bg-slate-100 text-slate-500">{ENTITY_LABELS[log.entityType]}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                By <span className="font-medium text-slate-600">{log.changedBy.name}</span> &middot;{" "}
                {formatDateTime(log.changedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/history?${query.toString()}${query.toString() ? "&" : ""}page=${p}`}
              className={
                p === page
                  ? "flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-medium text-white"
                  : "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              }
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
