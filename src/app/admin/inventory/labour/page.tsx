import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { LabourItemsManager } from "@/components/inventory/LabourItemsManager";
import { prisma } from "@/lib/prisma";

export default async function LabourCatalogPage() {
  const labourItems = await prisma.labourItem.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="pb-10">
      <AdminTopBar title="Labour Catalog" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Labour Catalog</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintenance work types with a default price. Not Inventory Items — no stock is tracked.
          </p>
        </div>
        <LabourItemsManager labourItems={labourItems} />
      </div>
    </div>
  );
}
