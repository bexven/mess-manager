"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { monthStatusSchema } from "@/lib/validation";
import { formatMonthLabel } from "@/lib/utils";
import type { ActionResult } from "@/app/actions/meals";

export async function setMonthStatus(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = monthStatusSchema.parse(input);

    const existing = await prisma.month.findUniqueOrThrow({ where: { id: parsed.monthId } });
    if (existing.status === parsed.status) {
      return { ok: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.month.update({ where: { id: parsed.monthId }, data: { status: parsed.status } });
      await writeAuditLog(
        {
          entityType: "MONTH",
          entityId: parsed.monthId,
          action: "UPDATE",
          changedById: admin.id,
          field: "status",
          oldValue: existing.status,
          newValue: parsed.status,
          summary: `${formatMonthLabel(existing.year, existing.month)} was ${parsed.status === "CLOSED" ? "closed" : "reopened"} by ${admin.name}`,
        },
        tx,
      );
    });

    revalidatePath("/admin/months");
    revalidatePath("/dashboard");
    revalidatePath("/meals");
    revalidatePath("/expenses");
    revalidatePath("/report");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
