import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ReturnRequestsTable } from "@/components/inventory/ReturnRequestsTable";
import { getInventoryItemDisplayName, getWarehouses } from "@/lib/inventoryData";

export default async function ReturnRequestsPage() {
  const [requests, branches] = await Promise.all([
    prisma.stockReturnRequest.findMany({
      include: { employee: { select: { name: true, team: { select: { name: true } } } }, inventoryItem: true },
      orderBy: { createdAt: "desc" },
    }),
    getWarehouses("Active", "Branch"),
  ]);

  const rows = requests.map((r) => ({
    id: r.id,
    employeeName: r.employee.name,
    employeeTeamName: r.employee.team?.name ?? null,
    itemDisplayName: getInventoryItemDisplayName(r.inventoryItem),
    unit: r.inventoryItem.unit,
    quantity: r.quantity,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Return Requests" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Return Requests</h2>
          <p className="text-sm text-slate-500 mt-0.5">Employee-submitted requests to return stock — approve (picks a destination branch) or reject.</p>
        </div>
        <ReturnRequestsTable rows={rows} branches={branches} />
      </div>
    </div>
  );
}
