import "server-only";
import type { Prisma, AuditEntity, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

export interface AuditEntryInput {
  entityType: AuditEntity;
  entityId: string;
  action: AuditAction;
  changedById: string;
  /** Human-readable one-liner, e.g. "August 31 Dinner — Sk Moni: Ate -> Did not eat" */
  summary: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export async function writeAuditLog(entry: AuditEntryInput, tx: Tx = prisma) {
  await tx.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changedById: entry.changedById,
      summary: entry.summary,
      field: entry.field ?? null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
    },
  });
}

/**
 * Compares two plain objects field-by-field and writes one AuditLog row per
 * changed field. Use for UPDATE actions where several fields may change at once
 * (e.g. editing an expense). Fields not present in `fieldLabels` are ignored.
 */
export async function writeFieldDiffAudit(params: {
  entityType: AuditEntity;
  entityId: string;
  changedById: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  /** Maps object key -> human label used in the summary, e.g. { amount: "Amount" } */
  fieldLabels: Record<string, string>;
  /** Prefix for the summary line, e.g. "August 31 Dinner — Sk Moni" */
  summaryPrefix: string;
  tx?: Tx;
}) {
  const { entityType, entityId, changedById, before, after, fieldLabels, summaryPrefix, tx } =
    params;
  const client = tx ?? prisma;

  const changedFields = Object.keys(fieldLabels).filter((key) => {
    const beforeVal = before[key];
    const afterVal = after[key];
    return String(beforeVal ?? "") !== String(afterVal ?? "");
  });

  for (const field of changedFields) {
    const label = fieldLabels[field]!;
    const oldValue = before[field];
    const newValue = after[field];
    await writeAuditLog(
      {
        entityType,
        entityId,
        action: "UPDATE",
        changedById,
        field,
        oldValue: oldValue === null || oldValue === undefined ? null : String(oldValue),
        newValue: newValue === null || newValue === undefined ? null : String(newValue),
        summary: `${summaryPrefix} — ${label}: ${oldValue ?? "(empty)"} -> ${newValue ?? "(empty)"}`,
      },
      client,
    );
  }

  return changedFields.length > 0;
}
