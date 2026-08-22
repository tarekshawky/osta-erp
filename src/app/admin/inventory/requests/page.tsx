import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { StockRequestsTable } from "@/components/inventory/StockRequestsTable";
import { getInventoryItemDisplayName, getAllWarehousesQuantity, getWarehouses } from "@/lib/inventoryData";

export default async function StockRequestsPage() {
  const [requests, branches] = await Promise.all([
    prisma.stockRequest.findMany({
      include: { employee: { select: { name: true, teamId: true, team: { select: { name: true } } } }, inventoryItem: true },
      orderBy: { createdAt: "desc" },
    }),
    getWarehouses("Active", "Branch"),
  ]);

  const rows = await Promise.all(
    requests.map(async (r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.name,
      employeeTeamName: r.employee.team?.name ?? null,
      itemDisplayName: getInventoryItemDisplayName(r.inventoryItem),
      unit: r.inventoryItem.unit,
      requestedQuantity: r.requestedQuantity,
      approvedQuantity: r.approvedQuantity,
      reason: r.reason,
      status: r.status,
      available: r.status === "Pending" ? await getAllWarehousesQuantity(prisma, r.inventoryItemId) : 0,
      createdAt: r.createdAt,
    }))
  );

  return (
    <div className="pb-10">
      <AdminTopBar title="Stock Requests" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Stock Requests</h2>
          <p className="text-sm text-slate-500 mt-0.5">Employee-submitted requests for stock — approve (fully or partially) or reject.</p>
        </div>
        <StockRequestsTable rows={rows} branches={branches} />
      </div>
    </div>
  );
}
