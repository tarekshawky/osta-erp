import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTimeSlash } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { Pagination } from "@/components/admin/Pagination";
import { DeleteOrderButton } from "@/components/order/DeleteOrderButton";
import { ToastOnMount } from "@/components/ToastOnMount";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { ORDER_STATUSES, ORDER_STATUS_STYLES } from "@/lib/orderData";
import type { Prisma } from "@/generated/prisma";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; team?: string; page?: string }>;
}) {
  const { q = "", status = "all", team = "all", page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [teams, totalOrdersCount, openOrdersCount] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { not: "Done" } } }),
  ]);

  const where: Prisma.OrderWhereInput = {};
  if (q) {
    where.OR = [
      { number: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }
  if (status !== "all") where.status = status;
  if (team !== "all") where.team = { name: team };

  const filteredCount = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true, team: true, assignedTo: true },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="pb-10">
      <Suspense fallback={null}>
        <ToastOnMount message="Order deleted." />
      </Suspense>
      <AdminTopBar title="Orders" />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
            <p className="text-sm text-slate-500 mt-0.5">{totalOrdersCount} records</p>
          </div>
          <Link
            href="/admin/orders/new"
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + New Order
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 gap-3 max-w-md">
          <AdminStatCard label="Total Orders" value={String(totalOrdersCount)} valueClassName="text-blue-700" />
          <AdminStatCard label="In Progress" value={String(openOrdersCount)} valueClassName="text-amber-600" />
        </div>

        <form className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by customer, phone, or order no..."
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="team"
            defaultValue={team}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
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
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                    <Link href={`/admin/orders/${order.id}`}>{order.number}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTimeSlash(order.date)}</td>
                  <td className="px-4 py-3 text-slate-900">
                    <div>{order.customer.name}</div>
                    <div className="text-xs text-slate-400">{order.customer.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <TeamBadge name={order.team?.name} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {order.assignedTo.name.split(" ").slice(0, 2).join(" ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/orders/${order.id}/edit`}
                        title="Edit"
                        className="text-blue-600 hover:text-blue-700 p-1.5"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                        </svg>
                      </Link>
                      <DeleteOrderButton orderId={order.id} className="text-red-500 hover:text-red-600 p-1.5" />
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No orders match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/admin/orders"
            searchParams={{
              q,
              status,
              team,
            }}
          />
        </div>
      </div>
    </div>
  );
}
