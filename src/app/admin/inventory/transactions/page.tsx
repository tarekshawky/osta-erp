import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InventoryTransactionsTable } from "@/components/inventory/InventoryTransactionsTable";
import { InventoryTransactionsFilterBar } from "@/components/inventory/InventoryTransactionsFilterBar";
import { getInventoryTransactions, getInventoryItemDisplayName } from "@/lib/inventoryData";

export default async function InventoryTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; employeeId?: string; type?: string; from?: string; to?: string }>;
}) {
  const { itemId, employeeId, type, from, to } = await searchParams;

  const [items, employees] = await Promise.all([
    prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
  ]);

  const rows = await getInventoryTransactions({
    inventoryItemId: itemId || undefined,
    employeeId: employeeId || undefined,
    type: type || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Inventory Transactions" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Inventory Transactions</h2>
          <p className="text-sm text-slate-500 mt-0.5">Every stock movement, fully searchable and filterable.</p>
        </div>

        <InventoryTransactionsFilterBar
          items={items.map((i) => ({ id: i.id, displayName: getInventoryItemDisplayName(i) }))}
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          filters={{
            inventoryItemId: itemId ?? "",
            employeeId: employeeId ?? "",
            type: type ?? "",
            from: from ?? "",
            to: to ?? "",
          }}
        />

        <InventoryTransactionsTable rows={rows} />
      </div>
    </div>
  );
}
