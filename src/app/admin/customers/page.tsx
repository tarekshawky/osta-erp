import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { formatAed } from "@/lib/format";
import { formatDateSlash } from "@/lib/format";
import { EMIRATES } from "@/lib/invoiceData";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_STYLES,
  CUSTOMER_ACTIVITY_FILTERS,
  type CustomerActivityFilter,
  getCustomersFinancialMap,
  getFinancialsFor,
  matchesActivityFilter,
} from "@/lib/customerData";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Pagination } from "@/components/admin/Pagination";
import { ImportModal } from "@/components/admin/ImportModal";
import { ToastOnMount } from "@/components/ToastOnMount";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { importCustomersFromExcel } from "./import/actions";
import type { Prisma } from "@/generated/prisma";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; emirate?: string; status?: string; activity?: string; page?: string }>;
}) {
  await requireEmployee("ADMIN");
  const {
    q = "",
    emirate = "all",
    status = "all",
    activity = "All Customers",
    page: pageParam,
  } = await searchParams;
  const page = parsePage(pageParam);
  const activityFilter = (CUSTOMER_ACTIVITY_FILTERS as readonly string[]).includes(activity)
    ? (activity as CustomerActivityFilter)
    : "All Customers";

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { whatsapp: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { orders: { some: { number: { contains: q, mode: "insensitive" } } } },
      { invoices: { some: { number: { contains: q, mode: "insensitive" } } } },
      { quotations: { some: { number: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (emirate !== "all") where.emirate = emirate;
  if (status !== "all") where.status = status;

  const [totalCustomerCount, matchingCustomers] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } }),
  ]);

  const financialsMap = await getCustomersFinancialMap(matchingCustomers.map((c) => c.id));
  const activityFiltered = matchingCustomers.filter((c) =>
    matchesActivityFilter(activityFilter, c, getFinancialsFor(financialsMap, c.id))
  );

  const totalPages = Math.max(1, Math.ceil(activityFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageCustomers = activityFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = matchingCustomers.filter((c) => c.status === "Active").length;
  const vipCount = matchingCustomers.filter((c) => c.status === "VIP").length;
  const blockedCount = matchingCustomers.filter((c) => c.status === "Blocked").length;

  const exportParams = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(emirate !== "all" ? { emirate } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(activityFilter !== "All Customers" ? { activity: activityFilter } : {}),
  }).toString();

  return (
    <div className="pb-10">
      <Suspense fallback={null}>
        <ToastOnMount message="Customer deleted." />
      </Suspense>
      <AdminTopBar title="Customers" />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
            <p className="text-sm text-slate-500 mt-0.5">{totalCustomerCount} records</p>
          </div>
          <div className="flex items-center gap-2">
            {exportParams && (
              <a
                href={`/admin/customers/export?all=1`}
                className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2"
              >
                Export All Customers
              </a>
            )}
            <a
              href={`/admin/customers/export${exportParams ? `?${exportParams}` : ""}`}
              className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {exportParams ? "Export Current Results" : "Export XLSX"}
            </a>
            <ImportModal
              title="Import Customers"
              templateHref="/admin/customers/import/template"
              onImport={importCustomersFromExcel}
              trigger={
                <span className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21V9m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Import
                </span>
              }
            />
            <Link
              href="/admin/customers/new"
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
            >
              + Add New Customer
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Total Customers" value={String(totalCustomerCount)} valueClassName="text-blue-700" />
          <AdminStatCard label="Active" value={String(activeCount)} valueClassName="text-green-600" />
          <AdminStatCard label="VIP" value={String(vipCount)} valueClassName="text-purple-600" />
          <AdminStatCard label="Blocked" value={String(blockedCount)} valueClassName="text-red-500" />
        </div>

        <form className="mt-5 flex flex-col sm:flex-row gap-3 flex-wrap">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search customers..."
            className="flex-1 min-w-[220px] rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="emirate"
            defaultValue={emirate}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All Cities</option>
            {EMIRATES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All</option>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="activity"
            defaultValue={activityFilter}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            {CUSTOMER_ACTIVITY_FILTERS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filter
          </button>
        </form>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Outstanding</th>
                <th className="px-4 py-3 font-medium">Last Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageCustomers.map((c) => {
                const financials = getFinancialsFor(financialsMap, c.id);
                const displayName = c.type === "COMPANY" ? c.companyName || c.name : c.name;
                return (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-blue-600">
                        {displayName}
                      </Link>
                      <div className="text-xs text-slate-400">{c.code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{c.emirate}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{financials.totalOrders}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatAed(financials.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                      {formatAed(financials.outstandingAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {financials.lastOrderDate ? formatDateSlash(financials.lastOrderDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          CUSTOMER_STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {pageCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No customers match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/admin/customers"
            searchParams={{ q, emirate, status, activity: activityFilter }}
          />
        </div>
      </div>
    </div>
  );
}
