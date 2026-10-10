import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ToastOnMount } from "@/components/ToastOnMount";

export default async function AdminServicesPage() {
  await requireEmployee("ADMIN");

  const services = await prisma.servicePage.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      priceFrom: true,
      published: true,
      displayOrder: true,
    },
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Services" />
      <ToastOnMount message="Service page deleted." />

      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Service Pages</h2>
          <Link
            href="/admin/services/new"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + New Service
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Price From</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No service pages yet.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{service.displayOrder}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{service.nameEn}</td>
                    <td className="px-4 py-3 text-slate-500">/{service.slug}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {service.priceFrom != null ? `AED ${service.priceFrom}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          service.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {service.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/services/${service.id}/edit`} className="text-sm font-medium text-blue-600">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
