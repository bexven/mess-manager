"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importBackup } from "@/app/actions/backup";

const CONFIRM_PHRASE = "REPLACE ALL DATA";

export function BackupManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setSuccessMessage(null);
    if (!file) {
      setFileName(null);
      setFileContent(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileContent(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsText(file);
  }

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fileContent) {
      setError("Choose a backup file first.");
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(fileContent);
    } catch {
      setError("That file isn't valid JSON.");
      return;
    }

    startTransition(async () => {
      const result = await importBackup(parsedJson, confirmText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccessMessage(
        `Import complete: ${result.counts.users} users, ${result.counts.months} months, ` +
          `${result.counts.mealEntries} meal entries, ${result.counts.guestMeals} guest meals, ` +
          `${result.counts.expenses} expenses, ${result.counts.auditLogs} audit entries restored. ` +
          `If your account changed, you may need to sign in again.`,
      );
      setConfirmText("");
      setFileName(null);
      setFileContent(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Export All Data</h2>
        <p className="mb-4 text-sm text-slate-500">
          Downloads every user, month, meal, guest meal, expense, category, and audit-log entry as one JSON
          file. Keep it somewhere safe — it includes password hashes and all financial history.
        </p>
        <a href="/api/admin/backup/export" className="btn-primary inline-flex w-fit" download>
          <Download className="h-4 w-4" /> Export All Data
        </a>
      </section>

      <section className="card border-red-100">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4 text-red-500" /> Import (Replace All Data)
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Restoring a backup <strong>permanently deletes everything currently in the database</strong> —
          every user, meal, expense, and audit entry — and replaces it with the contents of the file. This
          cannot be undone. Use this to restore after a disaster, or to move data to a fresh install — not
          as a routine action.
        </p>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="label">Backup file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="input"
            />
            {fileName && <p className="mt-1 text-xs text-slate-500">Selected: {fileName}</p>}
          </div>
          <div>
            <label className="label">
              Type <span className="font-mono text-red-600">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {successMessage && (
            <p className="flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {successMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !fileContent || confirmText !== CONFIRM_PHRASE}
            className="btn-danger w-full"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Replace all data with this backup
          </button>
        </form>
      </section>
    </div>
  );
}
