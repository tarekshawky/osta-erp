import { EXPENSE_CATEGORIES } from "@/lib/expenseData";

export function CreditCardTransactionsFilterBar({
  basePath,
  employees,
  filters,
}: {
  basePath: string;
  employees: { id: string; name: string }[];
  filters: {
    search: string;
    category: string;
    employeeId: string;
    vendor: string;
    status: string;
  };
}) {
  return (
    <form method="get" className="mb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <input type="hidden" name="tab" value="transactions" />
      <input
        type="text"
        name="search"
        defaultValue={filters.search}
        placeholder="Search description, vendor, number"
        className="col-span-2 sm:col-span-3 lg:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        name="category"
        defaultValue={filters.category}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Categories</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
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
      <input
        type="text"
        name="vendor"
        defaultValue={filters.vendor}
        placeholder="Vendor"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        name="status"
        defaultValue={filters.status}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        <option value="Recorded">Recorded</option>
        <option value="Partially Refunded">Partially Refunded</option>
        <option value="Refunded">Refunded</option>
      </select>
      <div className="col-span-2 sm:col-span-3 lg:col-span-6 flex gap-2">
        <button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2">
          Apply Filters
        </button>
        <a href={`${basePath}?tab=transactions`} className="rounded-lg border border-slate-200 text-sm font-medium text-slate-600 px-4 py-2">
          Clear
        </a>
      </div>
    </form>
  );
}
