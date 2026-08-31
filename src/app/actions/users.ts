"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { writeAuditLog, writeFieldDiffAudit } from "@/lib/audit";
import { createUserSchema, updateUserSchema } from "@/lib/validation";
import { getOrCreateMonth, generateMealEntriesForMonth, currentYearMonth } from "@/lib/month";
import type { ActionResult } from "@/app/actions/meals";

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = createUserSchema.parse(input);

    const email = parsed.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "A user with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const user = await prisma.user.create({
      data: { name: parsed.name, email, passwordHash, role: parsed.role, active: true },
    });

    await writeAuditLog({
      entityType: "USER",
      entityId: user.id,
      action: "CREATE",
      changedById: admin.id,
      summary: `User "${user.name}" (${user.email}) was added as ${user.role}`,
    });

    // Backfill meal entries for the rest of the current open month so the new
    // member shows up in today's meals — but only from today onward, so they
    // aren't retroactively counted as having eaten on days before they joined.
    const { year, month } = currentYearMonth();
    const monthRecord = await getOrCreateMonth(year, month);
    const today = new Date().getUTCDate();
    await generateMealEntriesForMonth(monthRecord, [user.id], today);

    revalidatePath("/admin/users");
    revalidatePath("/meals");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateUser(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = updateUserSchema.parse(input);

    const existing = await prisma.user.findUniqueOrThrow({ where: { id: parsed.id } });

    if (existing.id === admin.id && (parsed.role !== "ADMIN" || !parsed.active)) {
      return { ok: false, error: "You cannot remove your own admin access or deactivate yourself." };
    }

    const email = parsed.email.toLowerCase().trim();
    if (email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return { ok: false, error: "A user with this email already exists." };
      }
    }

    const before = {
      name: existing.name,
      email: existing.email,
      role: existing.role,
      active: existing.active ? "Yes" : "No",
    };
    const after = { name: parsed.name, email, role: parsed.role, active: parsed.active ? "Yes" : "No" };

    const data: { name: string; email: string; role: "ADMIN" | "USER"; active: boolean; passwordHash?: string } = {
      name: parsed.name,
      email,
      role: parsed.role,
      active: parsed.active,
    };

    if (parsed.password) {
      data.passwordHash = await bcrypt.hash(parsed.password, 12);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: parsed.id }, data });

      await writeFieldDiffAudit({
        entityType: "USER",
        entityId: parsed.id,
        changedById: admin.id,
        before,
        after,
        fieldLabels: { name: "Name", email: "Email", role: "Role", active: "Active" },
        summaryPrefix: `User "${existing.name}"`,
        tx,
      });

      if (parsed.password) {
        await writeAuditLog(
          {
            entityType: "USER",
            entityId: parsed.id,
            action: "UPDATE",
            changedById: admin.id,
            field: "password",
            summary: `User "${existing.name}" — password was reset by ${admin.name}`,
          },
          tx,
        );
      }
    });

    revalidatePath("/admin/users");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
