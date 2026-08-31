import { requireAdmin } from "@/lib/session";
import { getAllCategories } from "@/lib/categories";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await getAllCategories();

  return <CategoryManager categories={categories} />;
}
