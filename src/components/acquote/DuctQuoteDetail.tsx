"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import * as actions from "@/app/admin/self-quotes/actions";
import type { QResult } from "@/app/admin/self-quotes/actions";
import { MODE_LABEL, UNITS, type Unit } from "@/lib/ductwork/config";
import { totalsOf, type DuctLine } from "@/lib/ductwork/engine";
import type { DuctSnapshot } from "@/lib/ductwork/snapshot";
import type { QuoteStatus } from "@/lib/acquote/status";
import { REQUEST_LABEL, StatusBadge } from "./QuotesList";

export type DuctDetailProps = {
  id: string; number: string; version: number; status: QuoteStatus; lang: string; requestType: string; snapshot: DuctSnapshot; customerUrl: string;
  customer: { name: string; company: string; phone: string; email: string };
  project: { projectType: string; emirate: string; location: string; projectName: string; siteAddress: string; description: string };
  createdAt: string; expiresAt: string; submittedAt: string | null; sentAt: string | null; rejectionReason: string; internalNotes: string; lastEditedBy: string;
  next: QuoteStatus[]; canRevise: boolean; canConvert: boolean; whatsapp: string | null;
  customerRecord: { id: string; code: string; name: string } | null; order: { id: string; number: string; status: string } | null;
  files: { id: string; name: string; size: number; mime: string; category: string; createdAt: string }[];
  versions: { id: string; version: number; total: number; reason: string; byType: string; byName: string; createdAt: string }[];
  events: { id: string; kind: string; actorType: string; actorName: string; note: string; createdAt: string }[];
};

type Panel = "send" | "accept" | "reject" | "review" | "inspect" | "note" | "revise" | null;

const card = "rounded-xl border border-slate-200 bg-white p-4";
const h3 = "mb-2 text-sm font-semibold text-slate-900";
const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm";
const lab = "mb-1 block text-xs font-medium text-slate-600";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const primary = "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40";
const danger = "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40";

const money = (n: number | null | undefined) => (n == null ? "To be quoted" : `AED ${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`);
const when = (iso: string | null, time = false) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }) : "—");
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const EVENT: Record<string, string> = {
  created: "Created by the customer", edited: "Changed by the customer", request_inspection: "Site inspection requested", request_final: "Final quotation requested", request_inquiry: "Project inquiry submitted",
  revised: "Revised by the team", status: "Status changed", sent: "Sent to the customer", converted: "Converted to a project", note: "Note", files: "Files attached", email_sent: "Email sent", email_failed: "Email failed",
};

type Row = { id: string; kind: DuctLine["kind"]; system: string | null; mode: DuctLine["mode"]; labelEn: string; labelAr: string; detailEn: string; detailAr: string; qty: string; unit: Unit; unitPrice: string };
const toRow = (l: DuctLine): Row => ({ id: l.id, kind: l.kind, system: l.system, mode: l.mode, labelEn: l.labelEn, labelAr: l.labelAr, detailEn: l.detailEn, detailAr: l.detailAr, qty: String(l.qty), unit: l.unit, unitPrice: l.unitPrice == null ? "" : String(l.unitPrice) });
const fromRow = (r: Row) => ({ ...r, qty: Number(r.qty) || 0, unitPrice: r.unitPrice.trim() === "" ? null : Number(r.unitPrice), rfq: r.unitPrice.trim() === "" });

function Row2({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-900">{v}</span></div>;
}

export function DuctQuoteDetail(p: DuctDetailProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>(() => p.snapshot.lines.map(toRow));
  const s = p.snapshot;

  const act = (fn: () => Promise<QResult>, ok: string, after?: (r: QResult) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return showToast(r.error ?? "Something went wrong.", "error");
      showToast(ok);
      after?.(r);
      setPanel(null);
      router.refresh();
    });
  const open = (x: Panel) => { setText(""); if (x === "revise") setRows(s.lines.map(toRow)); setPanel(panel === x ? null : x); };
  const pdf = (lang: string, inline = true) => `/admin/self-quotes/${p.id}/pdf?lang=${lang}${inline ? "&inline=1" : ""}`;
  const copy = async (v: string) => { try { await navigator.clipboard.writeText(v); showToast("Link copied."); } catch { showToast("Copy it from the address shown.", "error"); } };

  const edited = panel === "revise" ? rows.map(fromRow) : [];
  const preview = panel === "revise" ? totalsOf(edited.map((l) => ({ ...l, amount: l.unitPrice == null ? null : Math.round(l.unitPrice * l.qty * 100) / 100 })) as DuctLine[], s.totals.vatPercent, s.totals.areas, s.totals.totalArea) : null;
  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (to: QuoteStatus) => {
    if (to === "Sent") return open("send");
    if (to === "Accepted") return open("accept");
    if (to === "Rejected") return open("reject");
    if (to === "Under Technical Review") return open("review");
    if (to === "Site Inspection Required") return open("inspect");
    act(() => actions.setQuoteStatus(p.id, to, ""), `Moved to ${to}.`);
  };
  const done = p.status === "Converted to Project";

  return (
    <div className="flex flex-col gap-4">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{p.number}</h2><StatusBadge status={p.status} />
              {p.requestType && REQUEST_LABEL[p.requestType] && !p.order && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">{REQUEST_LABEL[p.requestType]}</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">Ductwork · version {p.version} · {p.lang === "ar" ? "Arabic" : "English"} · created {when(p.createdAt, true)} · valid until {when(p.expiresAt)} · last changed by {p.lastEditedBy || "customer"}</p>
            {p.order && <p className="text-xs text-slate-500">Project / work order <Link href={`/admin/orders/${p.order.id}`} className="font-semibold text-blue-700 hover:underline">{p.order.number}</Link> · {p.order.status}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={primary} href={pdf("both")} target="_blank" rel="noreferrer">View PDF (EN + AR)</a>
            <a className={btn} href={pdf("en", false)}>Download EN</a>
            <a className={btn} href={pdf("ar", false)}>Download AR</a>
            <a className={btn} href={pdf("both", false)}>Download both</a>
          </div>
        </div>
        {p.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">Rejected: {p.rejectionReason}</p>}
        {s.totals.rfq && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Not in the total yet (priced after review): {s.totals.rfqItems.map((i) => i.en).join(", ")}. Use <b>Revise quotation</b> to price them.</p>}
        {s.review.length > 0 && <p className="mt-3 rounded-lg bg-violet-50 p-2 text-sm text-violet-800">Subject to technical review (not confirmed by the customer): {s.review.map((r) => r.en).join("; ")}.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {p.next.map((to) => <button key={to} type="button" className={to === "Accepted" ? primary : btn} disabled={pending} onClick={() => move(to)}>{to === "Sent" ? "Send to customer" : to === "Accepted" ? "Accept" : to === "Rejected" ? "Reject" : `Mark: ${to}`}</button>)}
          {p.canRevise && <button type="button" className={btn} onClick={() => open("revise")}>Revise quotation</button>}
          {!p.next.includes("Sent") && !["Accepted", "Rejected"].includes(p.status) && !done && <button type="button" className={btn} onClick={() => open("send")}>Send to customer</button>}
          {p.canConvert && <button type="button" className={primary} disabled={pending} onClick={() => { if (window.confirm("Turn this accepted quotation into a project / work order? It is created as a request: you still plan the work and confirm the schedule.")) act(() => actions.convertQuote(p.id), "Converted to a project.", (r) => r.id && router.push(`/admin/orders/${r.id}`)); }}>Convert to project / work order</button>}
          <button type="button" className={btn} onClick={() => open("note")}>Add note</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Customer link:</span>
          <code className="max-w-full truncate rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{p.customerUrl}</code>
          <button type="button" className={btn} onClick={() => copy(p.customerUrl)}>Copy</button>
          {p.whatsapp && <a className={btn} href={p.whatsapp} target="_blank" rel="noreferrer">WhatsApp the customer</a>}
          <a className={btn} href={`tel:${p.customer.phone.replace(/[^\d+]/g, "")}`}>Call</a>
          {p.customer.email && <a className={btn} href={`mailto:${p.customer.email}`}>Email</a>}
        </div>
      </div>

      {panel && panel !== "revise" && (
        <div className={`${card} border-blue-200 bg-blue-50/40`}>
          <div className="max-w-2xl">
            <label className={lab}>{panel === "send" ? "Message to the customer (optional). They get the quotation PDF by email and a link; you also get a WhatsApp message to send." : panel === "reject" ? "Reason for rejecting (the customer will see this)" : panel === "note" ? "Internal note (customers never see it)" : "Note (optional)"}</label>
            <textarea className={input} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-2">
              <button type="button" className={panel === "reject" ? danger : primary} disabled={pending} onClick={() => {
                if (panel === "send") act(() => actions.sendQuote(p.id, text), "Quotation sent.", (r) => { if (r.whatsapp) window.open(r.whatsapp, "_blank"); });
                else if (panel === "note") act(() => actions.addQuoteNote(p.id, text), "Note saved.");
                else act(() => actions.setQuoteStatus(p.id, panel === "accept" ? "Accepted" : panel === "reject" ? "Rejected" : panel === "review" ? "Under Technical Review" : "Site Inspection Required", text), "Status updated.");
              }}>{panel === "send" ? "Send now" : panel === "reject" ? "Reject quotation" : panel === "accept" ? "Accept quotation" : panel === "note" ? "Save note" : "Update status"}</button>
            </div>
          </div>
        </div>
      )}

      {panel === "revise" && (
        <div className={`${card} border-blue-200 bg-blue-50/40`}>
          <p className="mb-2 text-sm font-semibold text-slate-900">Revise the quotation. This keeps a NEW version (the old one stays on record). Leave a price empty to keep that item as &ldquo;to be quoted&rdquo;. Discounts are lines of kind &ldquo;discount&rdquo; and are taken off the subtotal.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs text-slate-500"><tr><th className="px-1 py-1">Description (EN)</th><th className="px-1 py-1">الوصف (AR)</th><th className="px-1 py-1">Qty</th><th className="px-1 py-1">Unit</th><th className="px-1 py-1">Unit price (AED)</th><th className="px-1 py-1 text-right">Amount</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const amount = r.unitPrice.trim() === "" ? null : Math.round(Number(r.unitPrice) * (Number(r.qty) || 0) * 100) / 100;
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-1 py-1"><input className={input} value={r.labelEn} onChange={(e) => setRow(i, { labelEn: e.target.value })} />{r.mode && <div className="mt-0.5 text-[11px] text-slate-400">{MODE_LABEL[r.mode].en}</div>}</td>
                      <td className="px-1 py-1"><input className={input} dir="rtl" value={r.labelAr} onChange={(e) => setRow(i, { labelAr: e.target.value })} /></td>
                      <td className="px-1 py-1"><input className={`${input} w-24`} type="number" min={0.01} step="0.01" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} /></td>
                      <td className="px-1 py-1"><select className={`${input} w-24`} value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value as Unit })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></td>
                      <td className="px-1 py-1"><input className={`${input} w-32`} type="number" min={0} step="0.01" placeholder="to be quoted" value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} /></td>
                      <td className="px-1 py-1 text-right font-medium">{amount == null ? <span className="text-amber-700">to be quoted</span> : `${r.kind === "discount" ? "− " : ""}${money(amount)}`}</td>
                      <td className="px-1 py-1"><button type="button" className={btn} disabled={rows.length <= 1 || (r.kind === "duct" && rows.filter((x) => x.kind === "duct").length <= 1)} onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setRows([...rows, { id: `c${Date.now().toString(36)}`, kind: "custom", system: null, mode: null, labelEn: "", labelAr: "", detailEn: "", detailAr: "", qty: "1", unit: "LOT", unitPrice: "" }])}>+ Add a line</button>
            {!rows.some((r) => r.kind === "discount") && <button type="button" className={btn} onClick={() => setRows([...rows, { id: `x${Date.now().toString(36)}`, kind: "discount", system: null, mode: null, labelEn: "Discount", labelAr: "خصم", detailEn: "", detailAr: "", qty: "1", unit: "LOT", unitPrice: "0" }])}>+ Add a discount</button>}
          </div>
          {preview && <p className="mt-3 rounded-lg bg-white p-2 text-sm text-slate-700">New subtotal {money(preview.subtotal)} · VAT {preview.vatPercent}% {money(preview.vat)} · <b>Total {money(preview.total)}</b> (was {money(s.totals.total)}){preview.rfq ? " · some items still to be quoted" : ""}</p>}
          <label className={`${lab} mt-3`}>Reason (kept in the record)</label>
          <textarea className={input} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex gap-2"><button type="button" className={primary} disabled={pending} onClick={() => act(() => actions.reviseQuote(p.id, edited, text), "New version saved.")}>Save new version</button><button type="button" className={btn} onClick={() => setPanel(null)}>Cancel</button></div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className={h3}>Customer</h3>
          <Row2 k="Name" v={p.customer.name} />{p.customer.company && <Row2 k="Company" v={p.customer.company} />}<Row2 k="Phone / WhatsApp" v={p.customer.phone} /><Row2 k="Email" v={p.customer.email || "—"} />
          <Row2 k="ERP customer" v={p.customerRecord ? <Link href={`/admin/customers/${p.customerRecord.id}`} className="text-blue-700 hover:underline">{p.customerRecord.name} · {p.customerRecord.code}</Link> : "Created when converted to a project"} />
        </div>
        <div className={card}>
          <h3 className={h3}>Project</h3>
          <Row2 k="Project name" v={p.project.projectName || "—"} /><Row2 k="Type" v={p.project.projectType} /><Row2 k="Emirate" v={p.project.emirate} /><Row2 k="Location" v={p.project.location} /><Row2 k="Site address" v={p.project.siteAddress} />
          <Row2 k="Description" v={<span className="whitespace-pre-wrap">{p.project.description}</span>} />
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Duct sections ({s.sections.length}) · total area {s.totals.totalArea} m²</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">System</th><th className="py-1">Work</th><th className="py-1">Type</th><th className="py-1">Dimensions</th><th className="py-1 text-right">Area (m²)</th></tr></thead>
            <tbody>
              {s.sections.map((x, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5">{s.systems.find((y) => y.key === x.system)?.nameEn ?? x.system}</td><td className="py-1.5">{MODE_LABEL[x.mode].en}</td>
                  <td className="py-1.5">{x.method === "area" ? "Total area" : x.method === "rect" ? "Rectangular" : "Circular"}{x.description ? ` · ${x.description}` : ""}</td>
                  <td className="py-1.5 text-slate-600">{x.method === "area" ? `${x.sections ?? 1} section(s) in the BOQ` : x.method === "rect" ? `${x.widthMm} × ${x.heightMm} mm, ${x.lengthM} m × ${x.qty}` : `Ø ${x.diameterMm} mm, ${x.lengthM} m × ${x.qty}`}</td>
                  <td className="py-1.5 text-right font-medium">{x.areaM2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Quotation items {s.manual && <span className="ms-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">revised by the team</span>}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Description</th><th className="py-1">Qty</th><th className="py-1 text-right">Unit price</th><th className="py-1 text-right">Amount</th></tr></thead>
            <tbody>{s.lines.map((l) => <tr key={l.id} className="border-t border-slate-100"><td className="py-1.5">{l.labelEn}{l.detailEn && <div className="text-xs text-slate-500">{l.detailEn}</div>}{l.mode && <div className="text-[11px] text-slate-400">{MODE_LABEL[l.mode].en}</div>}</td><td className="py-1.5">{l.qty} {l.unit}</td><td className="py-1.5 text-right">{l.unitPrice == null ? <span className="text-amber-700">to be quoted</span> : money(l.unitPrice)}</td><td className="py-1.5 text-right font-medium">{l.amount == null ? <span className="text-amber-700">to be quoted</span> : `${l.kind === "discount" ? "− " : ""}${money(l.amount)}`}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="ms-auto mt-3 max-w-sm">
          <Row2 k="Ductwork" v={money(s.totals.ductSubtotal)} /><Row2 k="Accessories / components" v={money(s.totals.accessoriesSubtotal)} /><Row2 k="Additional services" v={money(s.totals.servicesSubtotal)} />
          {s.totals.discount > 0 && <Row2 k="Discount" v={`− ${money(s.totals.discount)}`} />}
          <Row2 k="Subtotal (excl. VAT)" v={money(s.totals.subtotal)} /><Row2 k={`VAT ${s.totals.vatPercent}%`} v={money(s.totals.vat)} /><Row2 k="Grand total incl. VAT" v={<span className="text-base">{money(s.totals.total)}</span>} />
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Technical specifications</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          {s.specRows.map((r, i) => <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5"><span className="text-slate-500">{r.labelEn}</span><span className={r.confirmed ? "font-medium text-slate-900" : "font-medium text-violet-700"}>{r.valueEn}</span></li>)}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className={h3}>Drawings and BOQ from the customer</h3>
          {p.files.length === 0 ? <p className="text-sm text-slate-500">No drawings or BOQ were attached.</p> : <ul className="divide-y divide-slate-100 text-sm">{p.files.map((f) => <li key={f.id} className="flex items-center justify-between gap-2 py-1.5"><span className="truncate text-slate-700">{f.category === "boq" ? "BOQ" : f.category === "drawing" ? "Drawing" : "File"} · {f.name} · {kb(f.size)}</span><a className={btn} href={`/admin/self-quotes/${p.id}/files/${f.id}`}>Download</a></li>)}</ul>}
        </div>
        <div className={card}>
          <h3 className={h3}>Versions</h3>
          <ul className="divide-y divide-slate-100 text-sm">{p.versions.map((v) => <li key={v.id} className="flex flex-wrap justify-between gap-2 py-1.5"><span><b>v{v.version}</b> · {money(v.total)} · {v.byType === "admin" ? v.byName : "customer"}</span><span className="text-xs text-slate-500">{when(v.createdAt, true)}{v.reason ? ` · ${v.reason}` : ""}</span></li>)}</ul>
        </div>
      </div>

      {p.internalNotes && <div className={card}><h3 className={h3}>Internal notes</h3><pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{p.internalNotes}</pre></div>}

      <div className={card}>
        <h3 className={h3}>Audit trail</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          {p.events.map((e) => <li key={e.id} className="flex flex-wrap gap-x-3 py-1.5"><span className="w-40 shrink-0 text-xs text-slate-400">{when(e.createdAt, true)}</span><span className="font-medium text-slate-900">{EVENT[e.kind] ?? e.kind}</span><span className="text-xs text-slate-500">{e.actorType === "admin" ? e.actorName : e.actorType === "customer" ? `Customer · ${e.actorName}` : "System"}</span>{e.note && <span className="basis-full text-slate-600 sm:basis-auto">{e.note}</span>}</li>)}
        </ul>
      </div>
    </div>
  );
}
