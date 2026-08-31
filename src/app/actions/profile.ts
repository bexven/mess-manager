"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { changeOwnPasswordSchema, updateAvatarSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/meals";

export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = changeOwnPasswordSchema.parse(input);

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const isValid = await bcrypt.compare(parsed.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return { ok: false, error: "Your current password is incorrect." };
    }

    const passwordHash = await bcrypt.hash(parsed.newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await writeAuditLog(
        {
          entityType: "USER",
          entityId: user.id,
          action: "UPDATE",
          changedById: user.id,
          field: "password",
          summary: `User "${user.name}" changed their own password`,
        },
        tx,
      );
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateOwnAvatar(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateAvatarSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { avatarDataUrl: parsed.avatarDataUrl } });
      // Deliberately not storing the image data itself in the audit log —
      // just a note that it changed, to avoid bloating AuditLog rows.
      await writeAuditLog(
        {
          entityType: "USER",
          entityId: user.id,
          action: "UPDATE",
          changedById: user.id,
          field: "avatar",
          summary: `User "${user.name}" updated their profile picture`,
        },
        tx,
      );
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function removeOwnAvatar(): Promise<ActionResult> {
  try {
    const user = await requireUser();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { avatarDataUrl: null } });
      await writeAuditLog(
        {
          entityType: "USER",
          entityId: user.id,
          action: "UPDATE",
          changedById: user.id,
          field: "avatar",
          summary: `User "${user.name}" removed their profile picture`,
        },
        tx,
      );
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
