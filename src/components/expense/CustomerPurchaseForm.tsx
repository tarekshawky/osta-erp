"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { EXPENSE_PAYMENT_METHODS } from "@/lib/expenseData";
import { EMIRATES } from "@/lib/performanceData";
import { itemTotal, purchaseTotal } from "@/lib/expenseClasses";
import { formatAed } from "@/lib/format";
import { createCustomerPurchase, updateCustomerPurchase, searchCustomers, searchOrders, type CustomerLookup, type OrderLookup } from "@/app/admin/expenses/purchases/actions";
import { AttachmentField } from "./AttachmentField";

type Option = { id: string; name: string };
type Card = { id: string; name: string; lastFour: string };
type Line = { name: string; description: string; qty: string; unitPrice: string; supplier: string; supplierInvoiceNo: string };
export type PurchaseFormInitial = {
  id?: string; customer: CustomerLookup | null; order: { id: string; number: string } | null; purchaseDate: string; supplierName: string; supplierInvoiceNo: string;
  paymentMethod: string; creditCardId: string; notes: string; supplierInvoiceUrl: string | null; teamId: string; technicianId: string; emirate: string; lines: Line[]; lockPayment?: boolean;
};

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";
const lab = "text-xs font-medium text-slate-600";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
export const emptyLine = (): Line => ({ name: "", description: "", qty: "1", unitPrice: "", supplier: "", supplierInvoiceNo: "" });

function F({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}>
      <span className={lab}>{label}</span>
      {children}
    </label>
  );
}

export function CustomerPurchaseForm({ initial, teams, employees, cards, mode = "create" }: { initial?: PurchaseFormInitial; teams: Option[]; employees: Option[]; cards: Card[]; mode?: "create" | "edit" }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerLookup | null>(initial?.customer ?? null);
  const [order, setOrder] = useState<{ id: string; number: string } | null>(initial?.order ?? null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderLookup[]>([]);
  const [customers, setCustomers] = useState<CustomerLookup[]>([]);
  const [v, setV] = useState({
    purchaseDate: initial?.purchaseDate ?? today(), supplierName: initial?.supplierName ?? "", supplierInvoiceNo: initial?.supplierInvoiceNo ?? "",
    paymentMethod: initial?.paymentMethod ?? "Cash", creditCardId: initial?.creditCardId ?? "", notes: initial?.notes ?? "", teamId: initial?.teamId ?? "",
    technicianId: initial?.technicianId ?? "", emirate: initial?.emirate ?? "",
  });
  const [lines, setLines] = useState<Line[]>(initial?.lines?.length ? initial.lines : [emptyLine()]);
  const [file, setFile] = useState<string | null>(initial?.supplierInvoiceUrl ?? null);
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val }));

  // Find a service order (or a customer) as you type.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      Promise.resolve().then(() => { setOrders([]); setCustomers([]); });
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const [o, c] = await Promise.all([searchOrders(term), searchCustomers(term)]);
        if (!cancelled) { setOrders(o); setCustomers(c); }
      } catch {
        if (!cancelled) { setOrders([]); setCustomers([]); }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  function pickOrder(o: OrderLookup) {
    setOrder({ id: o.orderId, number: o.number });
    setCustomer({ id: o.customerId, name: o.customerName, code: o.customerCode, phone: "", emirate: o.emirate });
    setInvoiceNumber(o.invoiceNumber);
    setV((x) => ({ ...x, teamId: o.teamId ?? x.teamId, technicianId: o.technicianId ?? x.technicianId, emirate: o.emirate || x.emirate }));
    setQ(""); setOrders([]); setCustomers([]);
  }
  function pickCustomer(c: CustomerLookup) {
    setCustomer(c); setOrder(null); setInvoiceNumber(null);
    setV((x) => ({ ...x, emirate: c.emirate || x.emirate }));
    setQ(""); setOrders([]); setCustomers([]);
  }

  const items = lines.map((l) => ({ name: l.name, description: l.description, qty: Number(l.qty), unitPrice: Number(l.unitPrice), supplier: l.supplier, supplierInvoiceNo: l.supplierInvoiceNo }));
  const total = purchaseTotal(items.map((i) => ({ qty: Number.isFinite(i.qty) ? i.qty : 0, unitPrice: Number.isFinite(i.unitPrice) ? i.unitPrice : 0 })));
  const setLine = (i: number, k: keyof Line, val: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: val } : l)));

  function save() {
    setError(null);
    if (!customer) return setError("Choose the service order or the customer.");
    const payload = {
      customerId: customer.id, orderId: order?.id ?? null, purchaseDate: v.purchaseDate, supplierName: v.supplierName, supplierInvoiceNo: v.supplierInvoiceNo, paymentMethod: v.paymentMethod,
      creditCardId: v.creditCardId || null, notes: v.notes, supplierInvoiceUrl: file, teamId: v.teamId || null, technicianId: v.technicianId || null, emirate: v.emirate || null, items,
    };
    start(async () => {
      const res = mode === "edit" && initial?.id ? await updateCustomerPurchase(initial.id, payload) : await createCustomerPurchase(payload);
      if (res.ok) {
        showToast(mode === "edit" ? "Purchase updated." : "Purchase saved.");
        const id = initial?.id ?? ("id" in res ? (res as { id?: string }).id : undefined);
        router.push(id ? `/admin/expenses/purchases/${id}` : "/admin/expenses/purchases");
        router.refresh();
      } else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Customer Materials Purchase · شراء بضاعة لحساب العملاء</h2>
        <p className="mt-1 text-sm text-slate-500">Parts and materials bought for a customer&apos;s job. They are costed on the service order and are not general company expenses.</p>

        <div className="mt-4">
          <span className={lab}>Service order or customer · أمر الخدمة أو العميل</span>
          {customer ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">{customer.name} <span className="font-normal text-slate-500">· ID {customer.code}</span></div>
                <div className="text-xs text-slate-600">{order ? `Service order ${order.number}` : "No service order"}{invoiceNumber ? ` · Invoice ${invoiceNumber}` : ""}</div>
              </div>
              <button type="button" onClick={() => { setCustomer(null); setOrder(null); setInvoiceNumber(null); }} className="text-sm text-blue-700 hover:underline">Change</button>
            </div>
          ) : (
            <div className="relative mt-1">
              <input className={field} placeholder="Type an order number (ORD-…), customer name, phone or ID…" value={q} onChange={(e) => setQ(e.target.value)} />
              {(orders.length > 0 || customers.length > 0) && (
                <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {orders.map((o) => (
                    <li key={o.orderId}>
                      <button type="button" onClick={() => pickOrder(o)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <b>{o.number}</b> · {o.customerName}
                        <span className="block text-xs text-slate-500">{o.status}{o.teamName ? ` · ${o.teamName}` : ""}{o.technicianName ? ` · ${o.technicianName}` : ""}{o.invoiceNumber ? ` · ${o.invoiceNumber}` : ""}</span>
                      </button>
                    </li>
                  ))}
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pickCustomer(c)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
                        {c.name} <span className="text-xs text-slate-500">· {c.code} · {c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <F label="Purchase date · تاريخ الشراء"><input type="date" className={field} value={v.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></F>
          <F label="Emirate · الإمارة">
            <select className={field} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
              <option value="">— customer&apos;s emirate —</option>
              {EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </F>
          <F label="Team · الفريق">
            <select className={field} value={v.teamId} onChange={(e) => set("teamId", e.target.value)}>
              <option value="">— choose —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </F>
          <F label="Technician · الفني">
            <select className={field} value={v.technicianId} onChange={(e) => set("technicianId", e.target.value)}>
              <option value="">— choose —</option>
              {employees.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </F>
          <F label="Supplier name · المورد"><input className={field} value={v.supplierName} onChange={(e) => set("supplierName", e.target.value)} /></F>
          <F label="Supplier invoice number · رقم فاتورة المورد"><input className={field} value={v.supplierInvoiceNo} onChange={(e) => set("supplierInvoiceNo", e.target.value)} /></F>
          <F label="Payment method · طريقة الدفع">
            <select className={field} value={v.paymentMethod} disabled={initial?.lockPayment} onChange={(e) => set("paymentMethod", e.target.value)}>
              {EXPENSE_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </F>
          {v.paymentMethod === "Credit Card" && (
            <F label="Credit card · البطاقة">
              <select className={field} value={v.creditCardId} disabled={initial?.lockPayment} onChange={(e) => set("creditCardId", e.target.value)}>
                <option value="">— choose —</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name} ••{c.lastFour}</option>)}
              </select>
            </F>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">Products · المنتجات</h3>
          <button type="button" onClick={() => setLines((l) => [...l, emptyLine()])} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ Add product</button>
        </div>
        <div className="mt-3 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-12">
                <label className="flex flex-col gap-1 sm:col-span-5"><span className={lab}>Item · القطعة</span><input className={field} value={l.name} onChange={(e) => setLine(i, "name", e.target.value)} /></label>
                <label className="flex flex-col gap-1 sm:col-span-2"><span className={lab}>Qty · الكمية</span><input type="number" min="0" step="any" className={field} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} /></label>
                <label className="flex flex-col gap-1 sm:col-span-2"><span className={lab}>Unit price · السعر</span><input type="number" min="0" step="0.01" className={field} value={l.unitPrice} onChange={(e) => setLine(i, "unitPrice", e.target.value)} /></label>
                <div className="flex flex-col gap-1 sm:col-span-2"><span className={lab}>Total · الإجمالي</span><div className={`${field} bg-slate-50 font-semibold`}>{formatAed(itemTotal(Number(l.qty) || 0, Number(l.unitPrice) || 0))}</div></div>
                <div className="flex items-end sm:col-span-1">
                  {lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove product" className="rounded-lg border border-red-200 px-2.5 py-2 text-sm text-red-600 hover:bg-red-50">✕</button>}
                </div>
                <label className="flex flex-col gap-1 sm:col-span-6"><span className={lab}>Description · الوصف</span><input className={field} value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} /></label>
                <label className="flex flex-col gap-1 sm:col-span-3"><span className={lab}>Supplier (optional)</span><input className={field} value={l.supplier} onChange={(e) => setLine(i, "supplier", e.target.value)} /></label>
                <label className="flex flex-col gap-1 sm:col-span-3"><span className={lab}>Supplier invoice (optional)</span><input className={field} value={l.supplierInvoiceNo} onChange={(e) => setLine(i, "supplierInvoiceNo", e.target.value)} /></label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#0B2A6B] px-4 py-3 text-white">
          <span className="text-sm">Customer purchase total · إجمالي مشتريات العميل</span>
          <span className="text-lg font-bold">{formatAed(total)}</span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4">
          <F label="Notes · ملاحظات"><input className={field} value={v.notes} onChange={(e) => set("notes", e.target.value)} /></F>
          <AttachmentField value={file} onChange={setFile} label="Original supplier invoice (photo or PDF) · صورة فاتورة المورد" />
        </div>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/expenses/purchases" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Save purchase"}
        </button>
      </div>
    </div>
  );
}
