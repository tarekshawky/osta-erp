import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Pagination } from "@/components/admin/Pagination";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { WARRANTY_STATUS_LABEL, warrantyStatusOf, type WarrantyStatus } from "@/lib/warranty";
import type { Prisma } from "@/generated/prisma";

const STATUS_STYLE: Record<WarrantyStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-slate-100 text-slate-600",
  NO_WARRANTY: "bg-slate-50 text-slate-400",
};
const STATUSES = ["ACTIVE", "PENDING", "EXPIRED", "NO_WARRANTY"] as const;

// The UAE calendar day (UTC+4), as the noon-UTC moment invoice dates are stored at, so "active through its last day" is a plain comparison.
function todayNoon() {
  return new Date(new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10) + "T12:00:00Z");
}

function statusWhere(status: string, today: Date): Prisma.InvoiceWhereInput {
  const withWarranty: Prisma.InvoiceWhereInput = { warrantyMode: "WITH" };
  switch (status) {
    case "NO_WARRANTY":
      return { warrantyMode: "NONE" };
    case "PENDING":
      return { ...withWarranty, OR: [{ warrantyStartDate: null }, { warrantyStartDate: { gt: today } }] };
    case "ACTIVE":
      return { ...withWarranty, warrantyStartDate: { lte: today }, warrantyUntil: { gte: today } };
    case "EXPIRED":
      return { ...withWarranty, warrantyStartDate: { lte: today }, warrantyUntil: { lt: today } };
    default:
      return { warrantyMode: { in: ["NONE", "WITH"] } };
  }
}

export default async function InvoiceWarrantiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status = "all", page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const today = todayNoon();

  const where: Prisma.InvoiceWhereInput = { AND: [statusWhere(status, today)] };
  if (q) {
    (where.AND as Prisma.InvoiceWhereInput[]).push({
      OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }, { customer: { companyName: { contains: q } } }],
    });
  }

  const [counts, filteredCount] = await Promise.all([
    Promise.all(STATUSES.map((s) => prisma.invoice.count({ where: statusWhere(s, today) }))),
    prisma.invoice.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { date: "desc" },
    include: { customer: true },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const countOf = (s: WarrantyStatus) => counts[STATUSES.indexOf(s)];

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoice Warranties" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Invoice Warranties</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              The warranty chosen on each invoice. Invoices made before the warranty became a choice (a fixed 14 days) are not listed here.
            </p>
          </div>
          <Link href="/admin/warranty-certificates" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Warranty Certificates →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Active" value={String(countOf("ACTIVE"))} valueClassName="text-green-700" />
          <AdminStatCard label="Pending" value={String(countOf("PENDING"))} valueClassName="text-amber-600" />
          <AdminStatCard label="Expired" value={String(countOf("EXPIRED"))} valueClassName="text-slate-700" />
          <AdminStatCard label="No Warranty" value={String(countOf("NO_WARRANTY"))} valueClassName="text-slate-700" />
        </div>

        <form className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by invoice number or customer name..."
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select name="status" defaultValue={status} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {WARRANTY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Filter
          </button>
        </form>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Starts</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const st = warrantyStatusOf(inv);
                return (
                  <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                      <Link href={`/admin/invoices/${inv.id}`}>{inv.number}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{inv.customer.type === "COMPANY" ? inv.customer.companyName || inv.customer.name : inv.customer.name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.warrantyDays ? `${inv.warrantyDays} Days` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.warrantyStartDate ? formatDate(inv.warrantyStartDate) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.warrantyUntil ? formatDate(inv.warrantyUntil) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[st]}`}>{WARRANTY_STATUS_LABEL[st]}</span>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={safePage} totalPages={totalPages} basePath="/admin/warranty-certificates/invoices" searchParams={{ q, status: status === "all" ? undefined : status }} />
        </div>
      </div>
    </div>
  );
}
