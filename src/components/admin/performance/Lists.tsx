import Link from "next/link";
import { formatAed, formatDate } from "@/lib/format";
import type { CostRow, InvoiceRow, OrderRow } from "@/lib/performanceData";
import { collectedOf } from "@/lib/invoicePayment";

const LIMIT = 300;
const head = "whitespace-nowrap px-3 py-3 text-left font-medium";
const cell = "px-3 py-2.5";

function Card({ title, count, shown, children }: { title: string; count: number; shown: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-base font-semibold text-slate-900">
        {title} <span className="text-sm font-normal text-slate-500">({count}{count > shown ? `, showing the latest ${shown} — the Excel export has all` : ""})</span>
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">{children}</div>
    </section>
  );
}

const byDateDesc = <T extends { date: Date }>(rows: T[]) => [...rows].sort((a, b) => b.date.getTime() - a.date.getTime());

export function OrdersList({ rows, teamName }: { rows: OrderRow[]; teamName: (id: string | null) => string }) {
  const list = byDateDesc(rows).slice(0, LIMIT);
  return (
    <Card title="Service Orders" count={rows.length} shown={list.length}>
      <table className="w-full text-sm">
        <thead><tr><th className={head}>Order</th><th className={head}>Date</th><th className={head}>Customer</th><th className={head}>Emirate</th><th className={head}>Team</th><th className={head}>Status</th></tr></thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id} className="border-b border-slate-100">
              <td className={`${cell} font-medium text-blue-600`}><Link href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
              <td className={`${cell} whitespace-nowrap text-slate-600`}>{formatDate(o.date)}</td><td className={cell}>{o.customerName}</td>
              <td className={`${cell} text-slate-600`}>{o.emirate ?? "—"}</td><td className={`${cell} text-slate-600`}>{teamName(o.teamId)}</td><td className={cell}>{o.status}</td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No orders.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

export function InvoicesList({ rows, teamName }: { rows: InvoiceRow[]; teamName: (id: string | null) => string }) {
  const list = byDateDesc(rows).slice(0, LIMIT);
  return (
    <Card title="Invoices" count={rows.length} shown={list.length}>
      <table className="w-full text-sm">
        <thead>
          <tr><th className={head}>Invoice</th><th className={head}>Date</th><th className={head}>Customer</th><th className={head}>Emirate</th><th className={head}>Team</th><th className={head}>Method</th><th className={`${head} text-right`}>Invoiced</th><th className={`${head} text-right`}>Collected</th><th className={head}>Status</th></tr>
        </thead>
        <tbody>
          {list.map((i) => {
            const got = collectedOf(i);
            const state = got <= 0 ? "UNPAID" : got >= i.amount - i.refundedAmount - 0.005 ? "PAID" : "PARTIALLY PAID";
            const cls = state === "PAID" ? "bg-green-50 text-green-700" : state === "UNPAID" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600";
            return (
              <tr key={i.id} className="border-b border-slate-100">
                <td className={`${cell} font-medium text-blue-600`}><Link href={`/admin/invoices/${i.id}`}>{i.number}</Link></td>
                <td className={`${cell} whitespace-nowrap text-slate-600`}>{formatDate(i.date)}</td><td className={cell}>{i.customerName}</td>
                <td className={`${cell} text-slate-600`}>{i.emirate ?? "—"}</td><td className={`${cell} text-slate-600`}>{teamName(i.teamId)}</td><td className={`${cell} text-slate-600`}>{i.payment === "Ziina" ? "Zina" : i.payment}</td>
                <td className={`${cell} whitespace-nowrap text-right`}>{formatAed(i.amount - i.refundedAmount)}</td><td className={`${cell} whitespace-nowrap text-right`}>{formatAed(got)}</td>
                <td className={cell}><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{state}</span></td>
              </tr>
            );
          })}
          {list.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No invoices.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

export function CostsList({ rows, teamName, title = "Expense Transactions" }: { rows: CostRow[]; teamName: (id: string | null) => string; title?: string }) {
  const list = byDateDesc(rows).slice(0, LIMIT);
  return (
    <Card title={title} count={rows.length} shown={list.length}>
      <table className="w-full text-sm">
        <thead>
          <tr><th className={head}>Date</th><th className={head}>Team</th><th className={head}>Type</th><th className={head}>Category</th><th className={head}>Description</th><th className={head}>Vendor</th><th className={`${head} text-right`}>Amount</th><th className={head}>Record</th></tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={`${c.source}-${c.id}`} className="border-b border-slate-100">
              <td className={`${cell} whitespace-nowrap text-slate-600`}>{formatDate(c.date)}</td><td className={`${cell} text-slate-600`}>{teamName(c.teamId)}</td>
              <td className={cell}>{c.bucket}</td><td className={`${cell} text-slate-600`}>{c.category}</td><td className={cell}>{c.description}</td><td className={`${cell} text-slate-600`}>{c.vendor ?? "—"}</td>
              <td className={`${cell} whitespace-nowrap text-right font-medium`}>{formatAed(c.amount)}</td>
              <td className={`${cell} whitespace-nowrap`}>
                {c.attachmentUrl ? <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Attachment</a> : c.source === "Expense" ? <Link href="/admin/expenses" className="text-slate-400 hover:underline">Expenses</Link> : <Link href="/admin/payroll" className="text-slate-400 hover:underline">Payroll</Link>}
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No expenses.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
