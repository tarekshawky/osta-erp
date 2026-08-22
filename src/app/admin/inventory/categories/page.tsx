import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CategoriesManager } from "@/components/inventory/CategoriesManager";

export default async function InventoryCategoriesPage() {
  const categories = await prisma.inventoryCategory.findMany({
    include: { subcategories: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Categories" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500 mt-0.5">Add, rename, or deactivate Inventory categories and their subcategories.</p>
        </div>
        <CategoriesManager categories={categories} />
      </div>
    </div>
  );
}
