import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserManager } from "@/components/admin/UserManager";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, avatarDataUrl: true },
    orderBy: { createdAt: "asc" },
  });

  return <UserManager users={users} currentUserId={admin.id} />;
}
