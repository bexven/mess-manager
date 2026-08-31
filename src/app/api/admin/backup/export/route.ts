import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildBackup } from "@/lib/backup";

// A plain Route Handler (not requireAdmin()/redirect()) on purpose: this is a
// file download endpoint, not a page, and next/navigation's redirect() isn't
// meant for Route Handlers — a bare 401/403 JSON response is the right shape here.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backup = await buildBackup(session.user.name ?? "Admin");
  const filename = `mess-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
