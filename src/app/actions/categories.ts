"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { categoryInputSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/meals";

export async function createCategory(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = categoryInputSchema.parse(input);

    const existing = await prisma.category.findUnique({ where: { name: parsed.name } });
    if (existing) {
      return { ok: false, error: "A category with this name already exists." };
    }

    const category = await prisma.category.create({ data: { name: parsed.name, isDefault: false } });

    await writeAuditLog({
      entityType: "CATEGORY",
      entityId: category.id,
      action: "CREATE",
      changedById: admin.id,
      summary: `Category "${category.name}" was added by ${admin.name}`,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const existing = await prisma.category.findUniqueOrThrow({ where: { id } });

    if (existing.active === active) return { ok: true };

    await prisma.$transaction(async (tx) => {
      await tx.category.update({ where: { id }, data: { active } });
      await writeAuditLog(
        {
          entityType: "CATEGORY",
          entityId: id,
          action: "UPDATE",
          changedById: admin.id,
          field: "active",
          oldValue: existing.active ? "Yes" : "No",
          newValue: active ? "Yes" : "No",
          summary: `Category "${existing.name}" was ${active ? "re-enabled" : "disabled"} by ${admin.name}`,
        },
        tx,
      );
    });

    revalidatePath("/admin/categories");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
