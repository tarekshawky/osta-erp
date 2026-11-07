import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ContractDetail, type DetailProps } from "@/components/contracts/ContractDetail";
import { CONTRACT_INCLUDE, messageFor } from "@/lib/contracts/service";
import { agreementUrl } from "@/lib/contracts/notify";
import type { ContractSnapshot } from "@/lib/contracts/snapshot";
import { allowedActions, displayStatus } from "@/lib/contracts/workflow";

export const dynamic = "force-dynamic";
// Recording a payment and issuing a PDF build the agreement's file in this page's server actions.
export const maxDuration = 60;

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const c = await prisma.contract.findUnique({ where: { id }, include: CONTRACT_INCLUDE }).catch(() => null);
  if (!c) notFound();
  const snapshot = c.snapshot as unknown as ContractSnapshot;
  const [invoice, customer, renewedFrom, renewals] = await Promise.all([
    c.invoiceId ? prisma.invoice.findUnique({ where: { id: c.invoiceId }, select: { id: true, number: true, status: true, amount: true } }) : null,
    c.customerId ? prisma.customer.findUnique({ where: { id: c.customerId }, select: { id: true, code: true, name: true } }) : null,
    c.renewedFromId ? prisma.contract.findUnique({ where: { id: c.renewedFromId }, select: { id: true, number: true } }) : null,
    prisma.contract.findMany({ where: { renewedFromId: c.id }, select: { id: true, number: true } }),
  ]);
  const status = displayStatus(c);
  const props: DetailProps = {
    id: c.id, number: c.number, requestNumber: c.requestNumber, version: c.version, status, lang: c.lang, snapshot,
    termsVersion: c.termsVersion, acceptedAt: c.acceptedAt?.toISOString() ?? null, acceptanceMethod: c.acceptanceMethod, acceptanceIp: c.acceptanceIp, approvedAt: c.approvedAt?.toISOString() ?? null, approvedByName: c.approvedByName,
    paymentStatus: c.paymentStatus, paidAt: c.paidAt?.toISOString() ?? null, paymentMethod: c.paymentMethod, paymentReference: c.paymentReference, paymentNote: c.paymentNote,
    activationDate: c.activationDate?.toISOString() ?? null, expiryDate: c.expiryDate?.toISOString() ?? null, rejectionReason: c.rejectionReason, adminNotes: c.adminNotes, createdAt: c.createdAt.toISOString(),
    allowed: [...allowedActions(c)], agreementUrl: agreementUrl(c.accessToken), subscriptionId: c.subscriptionId,
    whatsapp: {
      agreement: messageFor(c, c.status === "DRAFT" ? "review" : "received").link,
      payment: c.status === "AWAITING_PAYMENT" ? messageFor(c, "payment").link : null,
      final: c.status === "ACTIVE" ? messageFor(c, "final").link : null,
    },
    customer, invoice, renewedFrom, renewals,
    events: c.events.map((e) => ({ id: e.id, kind: e.kind, actorType: e.actorType, actorName: e.actorName, note: e.note, createdAt: e.createdAt.toISOString() })),
    addenda: c.addenda.map((a) => ({ id: a.id, number: a.number, titleEn: a.titleEn, bodyEn: a.bodyEn, amountChange: a.amountChange, status: a.status, acceptedAt: a.acceptedAt?.toISOString() ?? null, acceptedNote: a.acceptedNote, createdAt: a.createdAt.toISOString() })),
    documents: c.documents.map((d) => ({ id: d.id, kind: d.kind, lang: d.lang, size: d.size, createdAt: d.createdAt.toISOString(), addendumId: d.addendumId })),
  };
  return (
    <div className="pb-10">
      <AdminTopBar title={`Agreement ${c.number}`} />
      <div className="px-6 py-6">
        <Link href="/admin/contracts" className="mb-3 inline-block text-sm text-blue-700 hover:underline">← All contracts</Link>
        <ContractDetail {...props} />
      </div>
    </div>
  );
}
