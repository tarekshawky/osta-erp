import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTimeSlash } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { ORDER_STATUS_STYLES } from "@/lib/orderData";

export default async function EmployeeOrdersPage() {
  const session = await getSession();
  const orders = await prisma.order.findMany({
    where: { assignedToId: session!.employeeId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, team: true },
  });

  return (
    <div className="pb-8">
      <TopBar title="Orders" />
      <div className="px-5 py-4">
        <p className="text-sm text-slate-500">{orders.length} records</p>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/employee/orders/${order.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 block hover:border-blue-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-600 text-sm">{order.number}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                {order.status}
              </span>
            </div>
            <div className="mt-2">
              <div className="font-medium text-slate-900 text-sm">
                {order.customer.companyName || order.customer.name}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {formatDateTimeSlash(order.date)} · {order.team?.name ?? "—"}
              </div>
            </div>
          </Link>
        ))}
        {orders.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-12">No orders assigned to you yet.</p>
        )}
      </div>
    </div>
  );
}
