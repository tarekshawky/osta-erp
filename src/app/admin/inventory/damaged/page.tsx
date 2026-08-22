import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InventoryTransactionsTable } from "@/components/inventory/InventoryTransactionsTable";
import { getInventoryTransactions } from "@/lib/inventoryData";

export default async function DamagedItemsPage() {
  const rows = await getInventoryTransactions({ type: "Stock Damaged" });

  return (
    <div className="pb-10">
      <AdminTopBar title="Damaged Items" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Damaged Items</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Every reported damage — never automatically returned to usable stock. Employees report these directly from My Inventory.
          </p>
        </div>
        <InventoryTransactionsTable rows={rows} />
      </div>
    </div>
  );
}
