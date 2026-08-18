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
    <form method="get" className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {year && <input type="hidden" name="year" value={year} />}
      {month && <input type="hidden" name="month" value={month} />}
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
      <div className="col-span-2 sm:col-span-4 flex gap-2">
        <button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2">
          Apply Filters
        </button>
        <a href={basePath} className="rounded-lg border border-slate-200 text-sm font-medium text-slate-600 px-4 py-2">
          Clear
        </a>
      </div>
    </form>
  );
}
