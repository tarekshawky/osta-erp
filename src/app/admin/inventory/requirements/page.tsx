import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { RequirementForm } from "@/components/inventory/RequirementForm";
import { getInventoryItemDisplayName } from "@/lib/inventoryData";

export default async function InventoryRequirementsPage() {
  const [employees, activeItems, requirements] = await Promise.all([
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.employeeInventoryRequirement.findMany({
      include: { employee: true, inventoryItem: true },
      orderBy: [{ employee: { name: "asc" } }],
    }),
  ]);

  const itemOptions = activeItems.map((i) => ({ id: i.id, displayName: getInventoryItemDisplayName(i), unit: i.unit }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Employee Requirements" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Employee Requirements</h2>
          <p className="text-sm text-slate-500 mt-0.5">Define how much stock each employee should normally have.</p>
        </div>

        {employees.length === 0 || itemOptions.length === 0 ? (
          <p className="text-sm text-slate-400">
            {employees.length === 0 ? "No active employees found." : "No active inventory items found."}
          </p>
        ) : (
          <RequirementForm employees={employees.map((e) => ({ id: e.id, name: e.name }))} items={itemOptions} />
        )}

        <h3 className="mt-8 font-semibold text-slate-900 mb-3">Current Requirements</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium text-right">Required</th>
                <th className="px-4 py-3 font-medium text-right">Minimum</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    <Link href={`/admin/employees/${r.employeeId}`} className="hover:text-blue-600">
                      {r.employee.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{getInventoryItemDisplayName(r.inventoryItem)}</td>
                  <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">
                    {r.requiredQuantity.toLocaleString()} {r.inventoryItem.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                    {r.minimumQuantity.toLocaleString()} {r.inventoryItem.unit}
                  </td>
                </tr>
              ))}
              {requirements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    No requirements set yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
