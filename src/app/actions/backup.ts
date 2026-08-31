"use server";

import { requireAdmin } from "@/lib/session";
import { backupSchema, restoreBackup, type RestoreCounts } from "@/lib/backup";

export type ImportResult = { ok: true; counts: RestoreCounts } | { ok: false; error: string };

const CONFIRM_PHRASE = "REPLACE ALL DATA";

export async function importBackup(rawInput: unknown, confirmPhrase: string): Promise<ImportResult> {
  try {
    await requireAdmin();

    if (confirmPhrase !== CONFIRM_PHRASE) {
      return { ok: false, error: `Type "${CONFIRM_PHRASE}" exactly to confirm.` };
    }

    const parsed = backupSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: "This file doesn't look like a valid Mess Manager backup (wrong shape or schema version).",
      };
    }

    // Deliberately not writing an audit-log entry for "who imported" here: the
    // User table itself was just replaced by whatever the backup contains, and
    // there's no guarantee the current admin's row still exists in it — the
    // imported data's own audit history is what's authoritative after this.
    const counts = await restoreBackup(parsed.data);

    return { ok: true, counts };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed." };
  }
}
