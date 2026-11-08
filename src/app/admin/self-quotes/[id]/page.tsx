import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { QuoteDetail, type QuoteDetailProps } from "@/components/acquote/QuoteDetail";
import { DuctQuoteDetail, type DuctDetailProps } from "@/components/acquote/DuctQuoteDetail";
import { loadConfig as loadDuctConfig, ductQuoteUrl } from "@/lib/ductwork/service";
import type { DuctSnapshot } from "@/lib/ductwork/snapshot";
import { SplitQuoteDetail, type SplitDetailProps } from "@/components/acquote/SplitQuoteDetail";
import { loadConfig as loadSplitConfig, splitQuoteUrl } from "@/lib/splitquote/service";
import type { SplitSnapshot } from "@/lib/splitquote/snapshot";
import { messageLink } from "@/lib/acquote/service";
import { quoteUrl } from "@/lib/acquote/notify";
import type { QuoteSnapshot } from "@/lib/acquote/snapshot";
import { adminCanRevise, adminNextFor, canConvert, displayStatus } from "@/lib/acquote/status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SelfQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const q = await prisma.selfQuote.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, total: true, reason: true, byType: true, byName: true, createdAt: true, snapshot: true } }, events: { orderBy: { createdAt: "desc" } }, files: { select: { id: true, name: true, size: true, mime: true, category: true, createdAt: true } } },
  }).catch(() => null);
  if (!q) notFound();
  const [order, customer] = await Promise.all([
    q.orderId ? prisma.order.findUnique({ where: { id: q.orderId }, select: { id: true, number: true, status: true } }) : null,
    q.customerId ? prisma.customer.findUnique({ where: { id: q.customerId }, select: { id: true, code: true, name: true } }) : null,
  ]);
  const status = displayStatus(q);
  const nav = (title: string, body: React.ReactNode) => (
    <div className="pb-10">
      <AdminTopBar title={title} />
      <div className="px-6 py-6">
        <Link href="/admin/self-quotes" className="mb-3 inline-block text-sm text-blue-700 hover:underline">← All quotations</Link>
        {body}
      </div>
    </div>
  );
  if (q.kind === "split-ac") {
    const cfg = await loadSplitConfig();
    const label = (list: { key: string; en: string }[], key: string) => list.find((x) => x.key === key)?.en ?? key;
    const proj = (q.project ?? {}) as Record<string, string>;
    const sprops: SplitDetailProps = {
      id: q.id, number: q.number, version: q.version, status, lang: q.lang, bookRequested: q.bookRequested, snapshot: q.snapshot as unknown as SplitSnapshot, customerUrl: splitQuoteUrl(q.accessToken),
      customer: { name: q.customerName, phone: q.phone, email: q.email },
      project: { propertyType: label(cfg.propertyTypes, q.propertyType), emirate: label(cfg.emirates, q.emirate), location: q.location, address: proj.address ?? "", notes: proj.notes ?? "" },
      createdAt: q.createdAt.toISOString(), expiresAt: q.expiresAt.toISOString(), submittedAt: q.submittedAt?.toISOString() ?? null, sentAt: q.sentAt?.toISOString() ?? null, rejectionReason: q.rejectionReason, internalNotes: q.internalNotes, lastEditedBy: q.lastEditedBy,
      next: adminNextFor(q.kind, status), canRevise: adminCanRevise(status), canConvert: canConvert(status), whatsapp: messageLink(q, "sent"), customerRecord: customer, order,
      versions: q.versions.map((v) => ({ id: v.id, version: v.version, total: v.total, reason: v.reason, byType: v.byType, byName: v.byName, createdAt: v.createdAt.toISOString(), lines: ((v.snapshot as unknown as SplitSnapshot | null)?.lines ?? []) })),
      events: q.events.map((e) => ({ id: e.id, kind: e.kind, actorType: e.actorType, actorName: e.actorName, note: e.note, createdAt: e.createdAt.toISOString() })),
    };
    return nav(`Quotation ${q.number}`, <SplitQuoteDetail {...sprops} />);
  }
  if (q.kind === "ductwork") {
    const cfg = await loadDuctConfig();
    const label = (list: { key: string; en: string }[], key: string) => list.find((x) => x.key === key)?.en ?? key;
    const proj = (q.project ?? {}) as Record<string, string>;
    const dprops: DuctDetailProps = {
      id: q.id, number: q.number, version: q.version, status, lang: q.lang, requestType: q.requestType, snapshot: q.snapshot as unknown as DuctSnapshot, customerUrl: ductQuoteUrl(q.accessToken),
      customer: { name: q.customerName, company: proj.company ?? "", phone: q.phone, email: q.email },
      project: { projectType: label(cfg.projectTypes, q.propertyType), emirate: label(cfg.emirates, q.emirate), location: q.location, projectName: proj.projectName ?? "", siteAddress: proj.siteAddress ?? "", description: proj.description ?? "" },
      createdAt: q.createdAt.toISOString(), expiresAt: q.expiresAt.toISOString(), submittedAt: q.submittedAt?.toISOString() ?? null, sentAt: q.sentAt?.toISOString() ?? null, rejectionReason: q.rejectionReason, internalNotes: q.internalNotes, lastEditedBy: q.lastEditedBy,
      next: adminNextFor(q.kind, status), canRevise: adminCanRevise(status), canConvert: canConvert(status), whatsapp: messageLink(q, "sent"), customerRecord: customer, order,
      files: q.files.map((f) => ({ ...f, category: f.category, createdAt: f.createdAt.toISOString() })), versions: q.versions.map((v) => ({ id: v.id, version: v.version, total: v.total, reason: v.reason, byType: v.byType, byName: v.byName, createdAt: v.createdAt.toISOString() })),
      events: q.events.map((e) => ({ id: e.id, kind: e.kind, actorType: e.actorType, actorName: e.actorName, note: e.note, createdAt: e.createdAt.toISOString() })),
    };
    return nav(`Quotation ${q.number}`, <DuctQuoteDetail {...dprops} />);
  }
  const snap = q.snapshot as unknown as QuoteSnapshot;
  const props: QuoteDetailProps = {
    id: q.id, number: q.number, version: q.version, status, lang: q.lang, bookRequested: q.bookRequested, snapshot: snap, customerUrl: quoteUrl(q.accessToken),
    customer: { name: q.customerName, phone: q.phone, whatsapp: q.whatsapp, email: q.email, contactMethod: q.contactMethod, preferredDate: q.preferredDate?.toISOString().slice(0, 10) ?? "" },
    project: { ...(q.project as Record<string, unknown>), propertyType: q.propertyType, emirate: q.emirate, location: q.location } as QuoteDetailProps["project"],
    createdAt: q.createdAt.toISOString(), expiresAt: q.expiresAt.toISOString(), submittedAt: q.submittedAt?.toISOString() ?? null, sentAt: q.sentAt?.toISOString() ?? null, rejectionReason: q.rejectionReason, internalNotes: q.internalNotes, lastEditedBy: q.lastEditedBy,
    next: adminNextFor(q.kind, status), canRevise: adminCanRevise(status), canConvert: canConvert(status), whatsapp: messageLink(q, "sent"), customerRecord: customer, order,
    files: q.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })), versions: q.versions.map((v) => ({ id: v.id, version: v.version, total: v.total, reason: v.reason, byType: v.byType, byName: v.byName, createdAt: v.createdAt.toISOString() })),
    events: q.events.map((e) => ({ id: e.id, kind: e.kind, actorType: e.actorType, actorName: e.actorName, note: e.note, createdAt: e.createdAt.toISOString() })),
  };
  return (
    <div className="pb-10">
      <AdminTopBar title={`Quotation ${q.number}`} />
      <div className="px-6 py-6">
        <Link href="/admin/self-quotes" className="mb-3 inline-block text-sm text-blue-700 hover:underline">← All quotations</Link>
        <QuoteDetail {...props} />
      </div>
    </div>
  );
}
