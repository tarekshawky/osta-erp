import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { QuotesList, type QuoteRow } from "@/components/acquote/QuotesList";
import { displayStatus } from "@/lib/acquote/status";

export const dynamic = "force-dynamic";

export default async function SelfQuotesPage() {
  await requireEmployee("ADMIN");
  let rows: QuoteRow[] | null = null;
  try {
    const list = await prisma.selfQuote.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { _count: { select: { files: true } } } });
    rows = list.map((q) => ({
      id: q.id, number: q.number, version: q.version, status: displayStatus(q), customer: q.customerName, phone: q.phone, emirate: q.emirate, total: q.total, rfq: q.rfq,
      bookRequested: q.bookRequested, files: q._count.files, createdAt: q.createdAt.toISOString(), expiresAt: q.expiresAt.toISOString(), converted: !!q.orderId, kind: q.kind, requestType: q.requestType,
    }));
  } catch {
    rows = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Self-Service Quotations" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Self-Service Quotations</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">Quotations customers built with the three calculators: Split AC installation, ducted / concealed / semi-central AC installation, and HVAC ductwork. Review them, revise the prices, send them back, and turn an accepted one into a service order or a project. Prices are under <b>Split AC pricing</b>, <b>Pricing &amp; Packages</b> and <b>Ductwork pricing</b>.</p>
        {rows ? <QuotesList rows={rows} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Self-service quotations need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
