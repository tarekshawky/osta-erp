import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { labelForKey } from "@/lib/homeSections";
import { ensureHomeSections } from "./actions";

export default async function AdminHomeSectionsPage() {
  await requireEmployee("ADMIN");
  await ensureHomeSections();

  const sections = await prisma.homeSection.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Homepage Sections" />
      <div className="px-6 py-6">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Homepage Sections</h2>
        <p className="mb-5 text-sm text-slate-500">
          Edit the content blocks shown on the public marketing homepage.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Heading</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sections.map((section) => (
                <tr key={section.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{labelForKey(section.key)}</td>
                  <td className="px-4 py-3 text-slate-500">{section.headingEn}</td>
                  <td className="px-4 py-3 text-slate-500">{section._count.items}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        section.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {section.enabled ? "Enabled" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/home-sections/${section.id}/edit`} className="text-sm font-medium text-blue-600">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
