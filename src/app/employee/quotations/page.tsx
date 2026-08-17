import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { TopBar } from "@/components/TopBar";

export default async function EmployeeQuotationsPage() {
  const session = await getSession();
  const quotations = await prisma.quotation.findMany({
    where: { createdById: session!.employeeId },
    orderBy: { date: "desc" },
    include: { items: true },
  });

  return (
    <div className="pb-8">
      <TopBar title="Quotations" />
      <div className="px-5 py-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{quotations.length} records</p>
        <Link
          href="/employee/quotation"
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5"
        >
          + New Quotation
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {quotations.map((quo) => {
          const amount = quo.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
          return (
            <Link
              key={quo.id}
              href={`/employee/quotations/${quo.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 block hover:border-blue-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-600 text-sm">{quo.number}</span>
                {quo.invoiceId && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    Converted
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 text-sm">
                    {quo.customerType === "COMPANY" ? quo.companyName || quo.customerName : quo.customerName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatDate(quo.date)}</div>
                </div>
                <div className="font-bold text-slate-900 text-sm">{formatAed(amount)}</div>
              </div>
            </Link>
          );
        })}
        {quotations.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-12">No quotations yet.</p>
        )}
      </div>
    </div>
  );
}
