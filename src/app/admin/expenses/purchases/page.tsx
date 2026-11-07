import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PURCHASE_STATUS_STYLE } from "@/lib/customerPurchaseData";

export default async function CustomerPurchasesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const where = status === "all" ? {} : { status };
  const [rows, all] = await Promise.all([
    prisma.customerPurchase.findMany({ where, orderBy: { purchaseDate: "desc" }, take: 300, include: { customer: true, order: { select: { number: true } }, _count: { select: { items: true } } } }),
    prisma.customerPurchase.groupBy({ by: ["status"], _count: true, _sum: { total: true } }),
  ]);
  const by = (s: string) => all.find((a) => a.status === s);

  return (
    <div className="pb-10">
      <AdminTopBar title="Customer Materials Purchases" hideMonth />
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customer Materials Purchases</h2>
            <p className="mt-0.5 text-sm text-slate-500">Parts bought for customers&apos; jobs, costed on the service order. They are not general company expenses.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/expenses/reports?report=customer" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Report</Link>
            <Link href="/admin/expenses/purchases/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New purchase</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStatCard label="Approved purchases" value={String(by("Approved")?._count ?? 0)} valueClassName="text-green-600" hint={formatAed(by("Approved")?._sum.total ?? 0)} />
          <AdminStatCard label="Pending approval" value={String(by("Pending")?._count ?? 0)} valueClassName="text-orange-600" hint={formatAed(by("Pending")?._sum.total ?? 0)} />
          <AdminStatCard label="Rejected" value={String(by("Rejected")?._count ?? 0)} valueClassName="text-red-500" />
          <AdminStatCard label="Total approved cost" value={formatAed(by("Approved")?._sum.total ?? 0)} valueClassName="text-blue-700" hint="Recorded once, as expenses" />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {["all", "Approved", "Pending", "Rejected"].map((s) => (
            <Link key={s} href={s === "all" ? "?" : `?status=${s}`} className={`rounded-full px-3.5 py-1.5 ${status === s ? "bg-[#1E5BD8] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {s === "all" ? "All" : s}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-3 font-medium">Purchase</th><th className="px-3 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Service order</th>
                <th className="px-3 py-3 font-medium">Team</th><th className="px-3 py-3 font-medium">Supplier</th><th className="px-3 py-3 text-right font-medium">Items</th><th className="px-3 py-3 text-right font-medium">Total</th><th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-blue-600"><Link href={`/admin/expenses/purchases/${r.id}`}>{r.number}</Link></td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.purchaseDate)}</td>
                  <td className="px-3 py-3">{r.customer.type === "COMPANY" ? r.customer.companyName || r.customer.name : r.customer.name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.order?.number ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{r.teamName ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{r.supplierName ?? "—"}</td>
                  <td className="px-3 py-3 text-right">{r._count.items}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{formatAed(r.total)}</td>
                  <td className="px-3 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PURCHASE_STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No purchases yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
