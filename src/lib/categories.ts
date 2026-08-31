import "server-only";
import { prisma } from "@/lib/prisma";

export async function getActiveCategories() {
  return prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export async function getAllCategories() {
  return prisma.category.findMany({ orderBy: [{ active: "desc" }, { name: "asc" } ] });
}

export async function getActiveUsersLite() {
  return prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
}
