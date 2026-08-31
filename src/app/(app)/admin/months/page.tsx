import { requireAdmin } from "@/lib/session";
import { getOrCreateMonth, currentYearMonth, listExistingMonths } from "@/lib/month";
import { MonthManager } from "@/components/admin/MonthManager";

export default async function AdminMonthsPage() {
  await requireAdmin();

  const { year, month } = currentYearMonth();
  await getOrCreateMonth(year, month); // ensure current month always exists

  const months = await listExistingMonths();

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Closing a month locks meals and expenses for regular members — admins can still edit and reopen at any time.
      </p>
      <MonthManager months={months} />
    </div>
  );
}
