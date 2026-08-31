import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditEntity, Prisma } from "@prisma/client";

export interface HistoryFilters {
  changedById?: string;
  entityType?: AuditEntity;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

export async function getAuditLogs(filters: HistoryFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  const where: Prisma.AuditLogWhereInput = {};
  if (filters.changedById) where.changedById = filters.changedById;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.from || filters.to) {
    where.changedAt = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { changedBy: { select: { id: true, name: true } } },
      orderBy: { changedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
