import { INVENTORY_TRANSACTION_TYPES } from "@/lib/inventoryData";

export function InventoryTransactionsFilterBar({
  items,
  employees,
  filters,
}: {
  items: { id: string; displayName: string }[];
  employees: { id: string; name: string }[];
  filters: { inventoryItemId: string; employeeId: string; type: string; from: string; to: string };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <path d="M4 5h16M7 12h10M11 19h2" strokeLinecap="round" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
      </div>

      <form method="get" className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Item</span>
          <select
            name="itemId"
            defaultValue={filters.inventoryItemId}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Items</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Employee</span>
          <select
            name="employeeId"
            defaultValue={filters.employeeId}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Type</span>
          <select
            name="type"
            defaultValue={filters.type}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {INVENTORY_TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">From</span>
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">To</span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div className="col-span-2 sm:col-span-5 flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
          <button
            type="submit"
            className="mt-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Apply Filters
          </button>
          <a
            href="/admin/inventory/transactions"
            className="mt-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-600 px-4 py-2"
          >
            Clear
          </a>
        </div>
      </form>
    </div>
  );
}
