import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { MyInventoryList } from "@/components/inventory/MyInventoryList";
import { RequestStockForm } from "@/components/inventory/RequestStockForm";
import { getEmployeeInventory, getInventoryItemDisplayName } from "@/lib/inventoryData";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  PartiallyApproved: "bg-blue-50 text-blue-700",
  Rejected: "bg-red-50 text-red-600",
};

export default async function MyInventoryPage() {
  const employee = await requireEmployee("EMPLOYEE");
  const [rows, activeItems, myRequests] = await Promise.all([
    getEmployeeInventory(employee.id),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.stockRequest.findMany({
      where: { employeeId: employee.id },
      include: { inventoryItem: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const itemOptions = activeItems.map((i) => ({ id: i.id, displayName: getInventoryItemDisplayName(i), unit: i.unit }));

  return (
    <div className="pb-8">
      <TopBar title="My Inventory" />
      <div className="px-5 py-4">
        <p className="text-sm text-slate-500 mb-4">What you currently have. Only Admin can change these quantities.</p>
        <MyInventoryList rows={rows} />

        <h3 className="mt-6 mb-3 font-semibold text-slate-900">Request Stock</h3>
        <RequestStockForm items={itemOptions} />

        {myRequests.length > 0 && (
          <>
            <h3 className="mt-6 mb-3 font-semibold text-slate-900">My Requests</h3>
            <div className="flex flex-col gap-2">
              {myRequests.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{getInventoryItemDisplayName(r.inventoryItem)}</div>
                    <div className="text-xs text-slate-500">
                      Requested {r.requestedQuantity.toLocaleString()} {r.inventoryItem.unit}
                      {r.approvedQuantity != null && r.status !== "Rejected" && ` · Approved ${r.approvedQuantity.toLocaleString()}`}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
