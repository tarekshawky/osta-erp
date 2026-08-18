import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WarehousesManager } from "@/components/inventory/WarehousesManager";
import { prisma } from "@/lib/prisma";

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="pb-10">
      <AdminTopBar title="Warehouses" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Warehouses</h2>
          <p className="text-sm text-slate-500 mt-0.5">Every physical location that can hold stock.</p>
        </div>
        <WarehousesManager warehouses={warehouses} />
      </div>
    </div>
  );
}
