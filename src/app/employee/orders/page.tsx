import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTimeSlash } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { ORDER_STATUS_STYLES } from "@/lib/orderData";
import { getEmployeeLang, pickLang } from "@/lib/employeeLang";
import { tajawal } from "@/lib/fonts";

const T = {
  ar: { records: "سجل", empty: "لا توجد طلبات مسندة إليك بعد." },
  en: { records: "records", empty: "No orders assigned to you yet." },
} as const;

export default async function EmployeeOrdersPage() {
  const session = await getSession();
  const lang = await getEmployeeLang();
  const s = pickLang(lang, T);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const orders = await prisma.order.findMany({
    where: { assignedToId: session!.employeeId, status: { not: "Cancelled" } },
    orderBy: { createdAt: "desc" },
    include: { customer: true, team: true },
  });

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "الطلبات", en: "Orders" }} />
      <div className="px-5 py-4" dir={dir}>
        <p className={`text-sm text-slate-500 ${font}`}>
          {orders.length} {s.records}
        </p>
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
          <p className={`text-center text-sm text-slate-400 py-12 ${font}`} dir={dir}>
            {s.empty}
          </p>
        )}
      </div>
    </div>
  );
}
