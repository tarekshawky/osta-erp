"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import * as actions from "@/app/admin/contracts/actions";
import type { CResult } from "@/app/admin/contracts/actions";
import { applyAdjustments, type ContractSnapshot } from "@/lib/contracts/snapshot";
import { ALTERNATIVE_ARRANGEMENT, PAYMENT_METHODS, type ContractAction, type DisplayStatus } from "@/lib/contracts/workflow";
import { StatusBadge } from "./ContractsList";

export type DetailProps = {
  id: string; number: string; requestNumber: string; version: number; status: DisplayStatus; lang: string; snapshot: ContractSnapshot;
  termsVersion: number; acceptedAt: string | null; acceptanceMethod: string; acceptanceIp: string; approvedAt: string | null; approvedByName: string;
  paymentStatus: string; paidAt: string | null; paymentMethod: string; paymentReference: string; paymentNote: string;
  activationDate: string | null; expiryDate: string | null; rejectionReason: string; adminNotes: string; createdAt: string;
  allowed: ContractAction[]; agreementUrl: string; subscriptionId: string | null;
  whatsapp: { agreement: string | null; payment: string | null; final: string | null };
  customer: { id: string; code: string; name: string } | null; invoice: { id: string; number: string; status: string; amount: number } | null;
  renewedFrom: { id: string; number: string } | null; renewals: { id: string; number: string }[];
  events: { id: string; kind: string; actorType: string; actorName: string; note: string; createdAt: string }[];
  addenda: { id: string; number: string; titleEn: string; bodyEn: string; amountChange: number; status: string; acceptedAt: string | null; acceptedNote: string; createdAt: string }[];
  documents: { id: string; kind: string; lang: string; size: number; createdAt: string; addendumId: string | null }[];
};

type Panel = "changes" | "revise" | "reject" | "payment" | "cancel" | "addendum" | "note" | null;

const card = "rounded-xl border border-slate-200 bg-white p-4";
const h3 = "mb-2 text-sm font-semibold text-slate-900";
const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm";
const lab = "mb-1 block text-xs font-medium text-slate-600";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const primary = "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40";
const danger = "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40";

const money = (n: number | null | undefined) => (n == null ? "To be quoted" : `AED ${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`);
const when = (iso: string | null, time = false) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }) : "—");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });

const EVENT_LABEL: Record<string, string> = {
  submitted: "Request submitted", accepted: "Customer accepted the agreement", draft_pdf: "Draft PDF created", final_pdf: "Final PDF created", approved: "Approved · payment link issued",
  changes_requested: "Changes requested", revised: "New version issued", rejected: "Rejected", cancelled: "Cancelled", payment_recorded: "Payment recorded", activated: "Agreement activated",
  renewed: "Renewal created", created: "Created", addendum_issued: "Addendum issued", addendum_accepted: "Addendum approved", email_sent: "Email sent", email_failed: "Email failed",
  resent: "Sent again", note: "Note", pdf_failed: "PDF could not be built",
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium text-slate-900">{v}</span>
    </div>
  );
}

export function ContractDetail(p: DetailProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const can = (a: ContractAction) => p.allowed.includes(a);
  const s = p.snapshot;

  const act = (fn: () => Promise<CResult>, ok: string, after?: (r: CResult) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return showToast(r.error ?? "Something went wrong.", "error");
      showToast(ok);
      after?.(r);
      setPanel(null);
      router.refresh();
    });

  const [text, setText] = useState("");
  const [pay, setPay] = useState({ method: PAYMENT_METHODS[0] as string, reference: "", note: "", paidDate: today() });
  const [rows, setRows] = useState<{ labelEn: string; labelAr: string; amount: string }[]>([{ labelEn: "", labelAr: "", amount: "" }]);
  const [pkgPrice, setPkgPrice] = useState("");
  const [settle, setSettle] = useState(true);
  const [add, setAdd] = useState({ titleEn: "", titleAr: "", bodyEn: "", bodyAr: "", amountChange: "" });

  const open = (x: Panel) => { setText(""); setPanel(panel === x ? null : x); };
  const adjustments = rows.map((r) => ({ labelEn: r.labelEn, labelAr: r.labelAr, amount: Number(r.amount) })).filter((r) => r.labelEn.trim() && Number.isFinite(r.amount) && r.amount !== 0);
  const preview = panel === "revise" ? applyAdjustments(s, adjustments, { packagePrice: s.pricing.packagePrice == null && pkgPrice !== "" ? Number(pkgPrice) : undefined, settleOpenItems: settle }) : null;

  const pdfHref = (q: string) => `/admin/contracts/${p.id}/pdf?${q}`;
  const copy = async (v: string) => { try { await navigator.clipboard.writeText(v); showToast("Link copied."); } catch { showToast("Copy it from the address shown.", "error"); } };
  const sent = (kind: "agreement" | "payment" | "final") => act(() => actions.resendMessage(p.id, kind), "Email sent.");

  return (
    <div className="flex flex-col gap-4">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-900">{p.number}</h2><StatusBadge status={p.status} /></div>
            <p className="mt-1 text-xs text-slate-500">Request {p.requestNumber} · version {p.version} · {p.lang === "ar" ? "Arabic" : "English"} · created {when(p.createdAt, true)} · terms v{p.termsVersion}</p>
            {p.renewedFrom && <p className="text-xs text-slate-500">Renewal of <Link className="text-blue-700 hover:underline" href={`/admin/contracts/${p.renewedFrom.id}`}>{p.renewedFrom.number}</Link></p>}
            {p.renewals.map((r) => <p key={r.id} className="text-xs text-slate-500">Renewed as <Link className="text-blue-700 hover:underline" href={`/admin/contracts/${r.id}`}>{r.number}</Link></p>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={btn} href={pdfHref("kind=draft&inline=1")} target="_blank" rel="noreferrer">Open draft PDF</a>
            {p.status === "ACTIVE" || p.status === "EXPIRED" ? <a className={primary} href={pdfHref("kind=final&inline=1")} target="_blank" rel="noreferrer">Open final PDF</a> : null}
          </div>
        </div>
        {p.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{p.status === "CANCELLED" ? "Cancelled" : "Rejected"}: {p.rejectionReason}</p>}
        {s.pricing.quote && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Some items are still &ldquo;to be quoted&rdquo; ({s.openItems.map((i) => i.en).join(", ")}). Use <b>Revise price</b> to set them; the customer then approves the final price before this can be approved.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {can("approve") && <button type="button" className={primary} disabled={pending || s.pricing.quote} onClick={() => { if (window.confirm(`Approve ${p.number} at ${money(s.pricing.total)} and send the payment link to ${s.customer.name}?`)) act(() => actions.approveContract(p.id), "Approved. The payment link was emailed to the customer."); }}>Approve &amp; Send Payment Link</button>}
          {can("recordPayment") && <button type="button" className={primary} onClick={() => open("payment")}>Record payment</button>}
          {can("requestChanges") && <button type="button" className={btn} onClick={() => open("changes")}>Request changes</button>}
          {can("revise") && <button type="button" className={btn} onClick={() => open("revise")}>Revise price</button>}
          {can("resendAgreement") && p.status !== "ACTIVE" && <button type="button" className={btn} disabled={pending} onClick={() => sent("agreement")}>Resend agreement</button>}
          {can("resendPaymentLink") && <button type="button" className={btn} disabled={pending} onClick={() => sent("payment")}>Resend payment link</button>}
          {p.status === "ACTIVE" && <button type="button" className={btn} disabled={pending} onClick={() => sent("final")}>Resend final PDF</button>}
          {can("addendum") && <button type="button" className={btn} onClick={() => open("addendum")}>Issue addendum</button>}
          {can("renew") && <button type="button" className={btn} disabled={pending} onClick={() => { if (window.confirm("Create a renewal agreement? The customer will be asked to review and accept it.")) act(() => actions.renewContract(p.id), "Renewal created.", (r) => r.id && router.push(`/admin/contracts/${r.id}`)); }}>Renew</button>}
          {can("reject") && <button type="button" className={btn} onClick={() => open("reject")}>Reject</button>}
          {can("cancel") && <button type="button" className={btn} onClick={() => open("cancel")}>Cancel agreement</button>}
          {can("regeneratePdf") && <button type="button" className={btn} disabled={pending} onClick={() => act(() => actions.regenerateDocument(p.id, p.status === "ACTIVE" || p.status === "EXPIRED" ? "final" : "draft"), "PDF rebuilt from the agreement's record.")}>Rebuild PDF</button>}
          <button type="button" className={btn} onClick={() => open("note")}>Add note</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Customer link:</span>
          <code className="max-w-full truncate rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{p.agreementUrl}</code>
          <button type="button" className={btn} onClick={() => copy(p.agreementUrl)}>Copy</button>
          {p.whatsapp.agreement && <a className={btn} href={p.whatsapp.agreement} target="_blank" rel="noreferrer">WhatsApp: agreement</a>}
          {p.whatsapp.payment && <a className={primary} href={p.whatsapp.payment} target="_blank" rel="noreferrer">WhatsApp: payment link</a>}
          {p.whatsapp.final && <a className={btn} href={p.whatsapp.final} target="_blank" rel="noreferrer">WhatsApp: final agreement</a>}
        </div>
      </div>

      {panel && (
        <div className={`${card} border-blue-200 bg-blue-50/40`}>
          {panel === "payment" && (
            <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
              <p className="text-sm font-semibold text-slate-900 sm:col-span-2">Record the payment of {money(s.pricing.total)}. This activates the agreement, creates the ERP invoice and issues the final PDF.</p>
              <div><label className={lab}>How was it received</label><select className={input} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
              <div><label className={lab}>Date received</label><input type="date" className={input} max={today()} value={pay.paidDate} onChange={(e) => setPay({ ...pay, paidDate: e.target.value })} /></div>
              <div><label className={lab}>Reference (transaction / transfer / receipt no.)</label><input className={input} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></div>
              <div><label className={lab}>Note</label><input className={input} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></div>
              {pay.method === ALTERNATIVE_ARRANGEMENT && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 sm:col-span-2">No money is recorded. Describe who approved the arrangement and its terms in the note. The agreement is activated, the ERP invoice stays <b>Unpaid</b>, and the final PDF says it is activated on an approved payment arrangement (not &ldquo;paid&rdquo;).</p>}
              <div className="sm:col-span-2"><button type="button" className={primary} disabled={pending} onClick={() => act(() => actions.recordPayment(p.id, pay), "Payment recorded. The agreement is active.")}>Confirm &amp; activate</button></div>
            </div>
          )}
          {(panel === "changes" || panel === "reject" || panel === "cancel" || panel === "note") && (
            <div className="max-w-2xl">
              <label className={lab}>{panel === "changes" ? "What does the customer need to change? (they will see this)" : panel === "reject" ? "Reason for rejecting (the customer will see this)" : panel === "cancel" ? "Reason for cancelling (kept in the audit trail). Refunds follow the agreement's non-refundable clause and UAE law and are handled separately." : "Internal note (customers never see it)"}</label>
              <textarea className={input} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="mt-2">
                <button type="button" className={panel === "reject" || panel === "cancel" ? danger : primary} disabled={pending} onClick={() => {
                  if (panel === "changes") act(() => actions.requestChanges(p.id, text), "The customer was asked for the change.");
                  if (panel === "reject") act(() => actions.rejectContract(p.id, text), "Rejected.");
                  if (panel === "cancel") { if (window.confirm("Cancel this agreement?")) act(() => actions.cancelContract(p.id, text), "Cancelled."); }
                  if (panel === "note") act(() => actions.addContractNote(p.id, text), "Note saved.");
                }}>{panel === "changes" ? "Send request" : panel === "reject" ? "Reject request" : panel === "cancel" ? "Cancel agreement" : "Save note"}</button>
              </div>
            </div>
          )}
          {panel === "revise" && (
            <div className="max-w-3xl">
              <p className="mb-2 text-sm font-semibold text-slate-900">Revise the price. This issues a NEW version that the customer must read and accept again; nothing changes until they do.</p>
              {s.pricing.packagePrice == null && <div className="mb-3 max-w-xs"><label className={lab}>Package price (AED)</label><input type="number" min="0" className={input} value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} /></div>}
              <p className="mb-1 text-xs text-slate-500">Charges (positive) and discounts (negative):</p>
              {rows.map((r, i) => (
                <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
                  <input className={input} placeholder="Description (English)" value={r.labelEn} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, labelEn: e.target.value } : x)))} />
                  <input className={input} dir="rtl" placeholder="الوصف (عربي)" value={r.labelAr} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, labelAr: e.target.value } : x)))} />
                  <input type="number" className={input} placeholder="AED" value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  <button type="button" className={btn} onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [{ labelEn: "", labelAr: "", amount: "" }])}>✕</button>
                </div>
              ))}
              <button type="button" className={btn} onClick={() => setRows([...rows, { labelEn: "", labelAr: "", amount: "" }])}>+ Add line</button>
              {s.openItems.length > 0 && <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={settle} onChange={(e) => setSettle(e.target.checked)} />These changes settle the items &ldquo;to be quoted&rdquo; (remove them from the agreement)</label>}
              {preview && <p className="mt-3 rounded-lg bg-white p-2 text-sm text-slate-700">New total: <b>{preview.pricing.quote ? "still to be quoted" : money(preview.pricing.total)}</b> (was {s.pricing.quote ? "to be quoted" : money(s.pricing.total)}) · VAT {money(preview.pricing.vat)} {preview.pricing.pricesIncludeVat ? "included" : "added"}</p>}
              <label className={`${lab} mt-3`}>Reason (the customer will see this)</label>
              <textarea className={input} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="mt-2"><button type="button" className={primary} disabled={pending} onClick={() => act(() => actions.reviseContract(p.id, { adjustments, packagePrice: s.pricing.packagePrice == null && pkgPrice !== "" ? Number(pkgPrice) : undefined, settleOpenItems: settle && s.openItems.length > 0, reason: text }), "New version sent to the customer for acceptance.")}>Issue new version</button></div>
            </div>
          )}
          {panel === "addendum" && (
            <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
              <p className="text-sm font-semibold text-slate-900 sm:col-span-2">Issue a contract addendum. The original agreement is never edited; the addendum records the change and the customer approves it.</p>
              <div><label className={lab}>Title (English)</label><input className={input} value={add.titleEn} onChange={(e) => setAdd({ ...add, titleEn: e.target.value })} /></div>
              <div><label className={lab}>العنوان (عربي)</label><input className={input} dir="rtl" value={add.titleAr} onChange={(e) => setAdd({ ...add, titleAr: e.target.value })} /></div>
              <div><label className={lab}>Change (English)</label><textarea className={input} rows={4} value={add.bodyEn} onChange={(e) => setAdd({ ...add, bodyEn: e.target.value })} /></div>
              <div><label className={lab}>التعديل (عربي)</label><textarea className={input} dir="rtl" rows={4} value={add.bodyAr} onChange={(e) => setAdd({ ...add, bodyAr: e.target.value })} /></div>
              <div><label className={lab}>Price change (AED, negative to deduct)</label><input type="number" className={input} value={add.amountChange} onChange={(e) => setAdd({ ...add, amountChange: e.target.value })} /></div>
              <div className="flex items-end"><button type="button" className={primary} disabled={pending} onClick={() => act(() => actions.issueAddendum(p.id, { ...add, amountChange: Number(add.amountChange) || 0 }), "Addendum issued and emailed.")}>Issue addendum</button></div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className={h3}>Customer &amp; property</h3>
          <Row k="Name" v={s.customer.name} /><Row k="Phone" v={s.customer.phone} />{s.customer.whatsapp && <Row k="WhatsApp" v={s.customer.whatsapp} />}<Row k="Email" v={s.customer.email} />
          <Row k="ERP customer" v={p.customer ? <Link href={`/admin/customers/${p.customer.id}`} className="text-blue-700 hover:underline">{p.customer.name} · {p.customer.code}</Link> : "Created on approval"} />
          <Row k="Emirate / area" v={[s.property.emirate, s.property.area].filter(Boolean).join(" – ")} /><Row k="Address" v={s.property.address || "—"} />
          <Row k="Property" v={s.property.type || "—"} /><Row k="Bedrooms / bathrooms" v={`${s.property.bedrooms || "—"} / ${s.property.bathrooms || "—"}`} />
          <Row k="Size / floors" v={`${s.property.size ? s.property.size.toLocaleString("en-US") : "—"} / ${s.property.floors || "—"}`} /><Row k="AC units" v={s.property.acUnits || "—"} />
          {s.property.notes && <Row k="Notes" v={s.property.notes} />}
          {p.subscriptionId && <p className="mt-2 text-xs"><Link href="/admin/website/maintenance-packages" className="text-blue-700 hover:underline">Open the original request →</Link></p>}
        </div>
        <div className={card}>
          <h3 className={h3}>Package &amp; services</h3>
          <Row k="Package" v={s.package.nameEn} /><Row k="Term" v={`${s.package.durationMonths} months`} />
          <Row k="AC units covered" v={s.package.acUnitsCovered ?? "—"} />{s.package.handymanHours != null && <Row k="Handyman hours" v={s.package.handymanHours} />}
          <ul className="my-2 list-disc ps-5 text-sm text-slate-700">{s.package.lines.map((l, i) => <li key={i}>{l.serviceEn}: <b>{l.quantityEn}</b></li>)}</ul>
          {s.package.excluded.length > 0 && <p className="text-xs text-slate-500">Not included: {s.package.excluded.map((x) => x.en).join(", ")}</p>}
          {s.extras.length > 0 && <div className="mt-2 border-t border-slate-100 pt-2"><p className="mb-1 text-xs font-semibold text-slate-600">Additional services</p>{s.extras.map((e, i) => <Row key={i} k={`${e.labelEn} × ${e.qty}`} v={e.included ? "Included" : money(e.amount)} />)}</div>}
        </div>
        <div className={card}>
          <h3 className={h3}>Financial summary</h3>
          <Row k="Package price" v={money(s.pricing.packagePrice)} /><Row k="Additional services" v={money(s.pricing.additional)} />
          <Row k="Discounts" v={s.pricing.discount ? `- ${money(s.pricing.discount)}` : "—"} />
          <Row k={`VAT (${s.pricing.vatPercent}%) ${s.pricing.pricesIncludeVat ? "included" : "added"}`} v={money(s.pricing.vat)} />
          <Row k="Total contract value" v={<span className="text-base">{s.pricing.quote ? "To be quoted" : money(s.pricing.total)}</span>} />
          <Row k="Payment" v={p.paymentStatus === "paid" ? "Paid" : p.paymentStatus === "arrangement" ? "Approved arrangement" : "Unpaid"} />
          {p.invoice && <Row k="ERP invoice" v={<Link href={`/admin/invoices/${p.invoice.id}`} className="text-blue-700 hover:underline">{p.invoice.number} · {p.invoice.status}</Link>} />}
        </div>
        <div className={card}>
          <h3 className={h3}>Acceptance &amp; activation</h3>
          <Row k="Customer accepted" v={p.acceptedAt ? when(p.acceptedAt, true) : "Not yet"} /><Row k="Method" v={p.acceptanceMethod || "—"} />
          {p.acceptanceIp && <Row k="IP address" v={p.acceptanceIp} />}<Row k="Terms version" v={p.termsVersion} />
          <Row k="Approved" v={p.approvedAt ? `${when(p.approvedAt)} by ${p.approvedByName}` : "—"} />
          <Row k="Payment received" v={p.paidAt ? `${when(p.paidAt)} · ${p.paymentMethod}` : p.paymentMethod || "—"} />{p.paymentReference && <Row k="Reference" v={p.paymentReference} />}{p.paymentNote && <Row k="Payment note" v={p.paymentNote} />}
          <Row k="Activated" v={when(p.activationDate)} /><Row k="Expires" v={when(p.expiryDate)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className={h3}>PDF files</h3>
          {p.documents.length === 0 ? <p className="text-sm text-slate-500">No file has been built yet. Use Rebuild PDF.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {p.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-slate-700">{d.kind === "final" ? "Final agreement" : d.kind === "addendum" ? "Addendum" : "Draft agreement"} · {when(d.createdAt, true)} · {Math.round(d.size / 1024)} KB · {d.lang.toUpperCase()}</span>
                  <span className="flex gap-1"><a className={btn} href={pdfHref(`doc=${d.id}&inline=1`)} target="_blank" rel="noreferrer">Open</a><a className={btn} href={pdfHref(`doc=${d.id}`)}>Download</a></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={card}>
          <h3 className={h3}>Addenda</h3>
          {p.addenda.length === 0 ? <p className="text-sm text-slate-500">No addendum has been issued.</p> : p.addenda.map((a) => (
            <div key={a.id} className="mb-2 rounded-lg border border-slate-100 p-2 text-sm">
              <div className="flex items-center justify-between"><b>{a.number}</b><span className={`text-xs font-semibold ${a.status === "accepted" ? "text-emerald-700" : "text-amber-700"}`}>{a.status === "accepted" ? `Approved ${when(a.acceptedAt)}` : "Awaiting customer approval"}</span></div>
              <p className="text-slate-700">{a.titleEn}{a.amountChange ? ` · ${a.amountChange > 0 ? "+" : "-"}${money(Math.abs(a.amountChange))}` : ""}</p>
              {a.acceptedNote && <p className="text-xs text-slate-500">{a.acceptedNote}</p>}
              {a.status === "issued" && <button type="button" className={`${btn} mt-1`} onClick={() => { const note = window.prompt("How did the customer approve it? (for example: WhatsApp message on 7 Nov)"); if (note) act(() => actions.approveAddendum(p.id, a.id, note), "Approval recorded."); }}>Record customer approval</button>}
            </div>
          ))}
        </div>
      </div>

      {p.adminNotes && <div className={card}><h3 className={h3}>Internal notes</h3><pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{p.adminNotes}</pre></div>}

      <div className={card}>
        <h3 className={h3}>Audit trail</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          {p.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3 py-1.5">
              <span className="w-40 shrink-0 text-xs text-slate-400">{when(e.createdAt, true)}</span>
              <span className="font-medium text-slate-900">{EVENT_LABEL[e.kind] ?? e.kind}</span>
              <span className="text-xs text-slate-500">{e.actorType === "admin" ? e.actorName : e.actorType === "customer" ? `Customer · ${e.actorName}` : "System"}</span>
              {e.note && <span className="basis-full text-slate-600 sm:basis-auto">{e.note}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
