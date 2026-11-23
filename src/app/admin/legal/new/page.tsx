import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { NewDocumentForm } from "./NewDocumentForm";

export default async function NewLegalDocumentPage() {
  await requireEmployee("ADMIN");
  const categories = await prisma.legalCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, key: true, nameEn: true } });
  return (
    <div className="pb-10">
      <AdminTopBar title="Legal Center" />
      <div className="max-w-2xl space-y-5 px-6 py-6">
        <Link href="/admin/legal" className="text-sm font-medium text-blue-600">← Legal Center</Link>
        <h2 className="text-2xl font-bold text-slate-900">New document</h2>
        <p className="text-sm text-slate-600">It is created as a draft. You write the clauses on the next screen, and nothing is shown to customers until you publish it.</p>
        <NewDocumentForm categories={categories} />
      </div>
    </div>
  );
}
