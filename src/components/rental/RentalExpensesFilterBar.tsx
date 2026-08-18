import { RENTAL_TYPES, RENTAL_PAYMENT_STATUSES, RENTAL_PAYMENT_METHODS } from "@/lib/rentalData";

export function RentalExpensesFilterBar({
  basePath,
  customers,
  filters,
  year,
  month,
}: {
  basePath: string;
  customers: { id: string; name: string }[];
  filters: { customerId: string; status: string; paymentMethod: string; rentalType: string };
  year: number | null;
  month: number | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <path d="M4 5h16M7 12h10M11 19h2" strokeLinecap="round" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
      </div>

      <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {year && <input type="hidden" name="year" value={year} />}
        {month && <input type="hidden" name="month" value={month} />}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Company</span>
          <select
            name="customerId"
            defaultValue={filters.customerId}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Companies</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Status</span>
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {RENTAL_PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Payment Method</span>
          <select
            name="paymentMethod"
            defaultValue={filters.paymentMethod}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Payment Methods</option>
            {RENTAL_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Rental Type</span>
          <select
            name="rentalType"
            defaultValue={filters.rentalType}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Rental Types</option>
            {RENTAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
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
            href={basePath}
            className="mt-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-600 px-4 py-2"
          >
            Clear
          </a>
        </div>
      </form>
    </div>
  );
}
