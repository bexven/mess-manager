import { requireAdmin } from "@/lib/session";
import { BackupManager } from "@/components/admin/BackupManager";

export default async function AdminBackupPage() {
  await requireAdmin();
  return <BackupManager />;
}
