import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";

export default async function EmployeeInvoicesPage() {
  const session = await getSession();
  const invoices = await prisma.invoice.findMany({
    where: { createdById: session!.employeeId },
    orderBy: { date: "desc" },
    include: { customer: true, items: true },
  });

  return (
    <div className="pb-8">
      <TopBar title="Invoices" />
      <div className="px-5 py-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{invoices.length} records</p>
        <Link
          href="/employee/invoices/new"
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5"
        >
          + New Invoice
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/employee/invoices/${inv.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 block hover:border-blue-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-600 text-sm">{inv.number}</span>
              <StatusBadge status={inv.status} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900 text-sm">
                  {inv.customer.type === "COMPANY" ? inv.customer.companyName : inv.customer.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatDate(inv.date)} · {inv.items.map((it) => it.serviceName).join(", ")}
                </div>
              </div>
              <div className="font-bold text-slate-900 text-sm">{formatAed(inv.amount)}</div>
            </div>
          </Link>
        ))}
        {invoices.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-12">No invoices yet.</p>
        )}
      </div>
    </div>
  );
}
