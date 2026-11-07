"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { EXPENSE_PAYMENT_METHODS } from "@/lib/expenseData";
import { EMIRATES } from "@/lib/performanceData";
import { EMPLOYEE_KINDS, RENTAL_KINDS, dailyWorkerTotal, inclusiveDays, type RentalGroup } from "@/lib/expenseClasses";
import { createClassifiedExpense, type ClassifiedExpenseInput } from "@/app/admin/expenses/classified-actions";
import { formatAed } from "@/lib/format";
import { AttachmentField } from "./AttachmentField";

type Option = { id: string; name: string };
type Card = { id: string; name: string; lastFour: string };

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";
const lab = "text-xs font-medium text-slate-600";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());

function F({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}>
      <span className={lab}>{label}</span>
      {children}
    </label>
  );
}

export function ClassifiedExpenseForm({ group, teams, employees, cards }: { group: "employee" | RentalGroup; teams: Option[]; employees: Option[]; cards: Card[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const kinds = EMPLOYEE_KINDS.filter((k) => !k.viaPayroll);
  const [kind, setKind] = useState(group === "employee" ? "Daily Worker" : RENTAL_KINDS[group].kind);
  const [v, setV] = useState({
    date: today(), payment: "Cash", creditCardId: "", teamId: "", emirate: "", description: "", notes: "", amount: "", employeeId: "",
    workerName: "", workerPhone: "", days: "", dailyRate: "", equipmentName: "", supplier: "", startDate: today(), endDate: today(), invoiceNumber: "", vehicleType: "",
  });
  const [file, setFile] = useState<string | null>(null);
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val }));

  const isDaily = group === "employee" && kind === "Daily Worker";
  const isTransport = group === "transport-rental";
  const isEquipment = group === "equipment-rental";
  const total = isDaily || isTransport ? dailyWorkerTotal(Number(v.days) || 0, Number(v.dailyRate) || 0) : Number(v.amount) || 0;
  const rentalDays = isEquipment ? inclusiveDays(v.startDate, v.endDate) : 0;

  function save() {
    setError(null);
    const input: ClassifiedExpenseInput = {
      group, kind, date: v.date, payment: v.payment, creditCardId: v.creditCardId || null, teamId: v.teamId || null, emirate: v.emirate || null,
      description: v.description, notes: v.notes, attachmentUrl: file, amount: Number(v.amount) || undefined, employeeId: v.employeeId || null,
      workerName: v.workerName, workerPhone: v.workerPhone, days: Number(v.days) || undefined, dailyRate: Number(v.dailyRate) || undefined,
      equipmentName: v.equipmentName, supplier: v.supplier, startDate: v.startDate, endDate: v.endDate, invoiceNumber: v.invoiceNumber, vehicleType: v.vehicleType,
    };
    start(async () => {
      const res = await createClassifiedExpense(input);
      if (res.ok) {
        showToast("Expense recorded.");
        router.push("/admin/expenses");
        router.refresh();
      } else setError(res.error ?? "Could not save.");
    });
  }

  const title = group === "employee" ? "Employee Expense · مصروف عامل" : `${RENTAL_KINDS[group].kind} · ${RENTAL_KINDS[group].ar}`;

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {group === "employee"
          ? "Salaries and advances are recorded in Payroll (so they are not counted twice)."
          : group === "equipment-rental"
            ? "Rent of equipment used by a team. The amount is the rental price."
            : "Rent of a transport vehicle: days × daily rate."}
        {group === "employee" && (
          <>
            {" "}
            <Link href="/admin/payroll" className="text-blue-600 hover:underline">Open Payroll</Link>
          </>
        )}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {group === "employee" && (
          <F label="Type · النوع" wide>
            <select className={field} value={kind} onChange={(e) => setKind(e.target.value)}>
              {kinds.map((k) => (
                <option key={k.kind} value={k.kind}>{k.kind} · {k.ar}</option>
              ))}
            </select>
          </F>
        )}

        {isDaily && (
          <>
            <F label="Worker name · اسم العامل"><input className={field} value={v.workerName} onChange={(e) => set("workerName", e.target.value)} /></F>
            <F label="Phone (optional) · الهاتف"><input className={field} inputMode="tel" value={v.workerPhone} onChange={(e) => set("workerPhone", e.target.value)} /></F>
            <F label="Work date · تاريخ العمل"><input type="date" className={field} value={v.date} onChange={(e) => set("date", e.target.value)} /></F>
            <F label="Number of days · عدد الأيام"><input type="number" min="0" step="0.5" className={field} value={v.days} onChange={(e) => set("days", e.target.value)} /></F>
            <F label="Daily rate (AED) · قيمة اليومية"><input type="number" min="0" step="0.01" className={field} value={v.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} /></F>
            <F label="Total due · إجمالي المستحق"><div className={`${field} bg-slate-50 font-semibold`}>{formatAed(total)}</div></F>
            <F label="Description of the work · وصف العمل" wide><input className={field} value={v.description} onChange={(e) => set("description", e.target.value)} /></F>
          </>
        )}

        {group === "employee" && !isDaily && (
          <>
            <F label="Date · التاريخ"><input type="date" className={field} value={v.date} onChange={(e) => set("date", e.target.value)} /></F>
            <F label="Amount (AED) · المبلغ"><input type="number" min="0" step="0.01" className={field} value={v.amount} onChange={(e) => set("amount", e.target.value)} /></F>
            <F label="Employee · الموظف (optional)">
              <select className={field} value={v.employeeId} onChange={(e) => set("employeeId", e.target.value)}>
                <option value="">— none —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </F>
            <F label="Or worker name · أو اسم العامل"><input className={field} value={v.workerName} onChange={(e) => set("workerName", e.target.value)} /></F>
            <F label="Description · الوصف" wide><input className={field} value={v.description} onChange={(e) => set("description", e.target.value)} /></F>
          </>
        )}

        {isEquipment && (
          <>
            <F label="Equipment name · اسم المعدة"><input className={field} value={v.equipmentName} onChange={(e) => set("equipmentName", e.target.value)} /></F>
            <F label="Supplier · المورد"><input className={field} value={v.supplier} onChange={(e) => set("supplier", e.target.value)} /></F>
            <F label="Start date · تاريخ البداية"><input type="date" className={field} value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></F>
            <F label="End date · تاريخ النهاية"><input type="date" className={field} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} /></F>
            <F label="Duration · المدة"><div className={`${field} bg-slate-50`}>{rentalDays > 0 ? `${rentalDays} day${rentalDays === 1 ? "" : "s"}` : "—"}</div></F>
            <F label="Rental price (AED) · سعر الإيجار"><input type="number" min="0" step="0.01" className={field} value={v.amount} onChange={(e) => set("amount", e.target.value)} /></F>
            <F label="Invoice number · رقم الفاتورة"><input className={field} value={v.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} /></F>
          </>
        )}

        {isTransport && (
          <>
            <F label="Vehicle type · نوع السيارة"><input className={field} placeholder="e.g. Pickup, Van, Truck" value={v.vehicleType} onChange={(e) => set("vehicleType", e.target.value)} /></F>
            <F label="Supplier / lessor · المؤجر"><input className={field} value={v.supplier} onChange={(e) => set("supplier", e.target.value)} /></F>
            <F label="Date · التاريخ"><input type="date" className={field} value={v.date} onChange={(e) => set("date", e.target.value)} /></F>
            <F label="Number of days · عدد الأيام"><input type="number" min="0" step="0.5" className={field} value={v.days} onChange={(e) => set("days", e.target.value)} /></F>
            <F label="Daily rate (AED) · السعر اليومي"><input type="number" min="0" step="0.01" className={field} value={v.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} /></F>
            <F label="Total amount · إجمالي المبلغ"><div className={`${field} bg-slate-50 font-semibold`}>{formatAed(total)}</div></F>
            <F label="Invoice number · رقم الفاتورة"><input className={field} value={v.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} /></F>
          </>
        )}

        <F label={isEquipment ? "Team using the equipment · الفريق" : "Team · الفريق"}>
          <select className={field} value={v.teamId} onChange={(e) => set("teamId", e.target.value)}>
            <option value="">— choose —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </F>
        <F label="Emirate · الإمارة">
          <select className={field} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
            <option value="">— choose —</option>
            {EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </F>
        <F label="Payment method · طريقة الدفع">
          <select className={field} value={v.payment} onChange={(e) => set("payment", e.target.value)}>
            {EXPENSE_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </F>
        {v.payment === "Credit Card" && (
          <F label="Credit card · البطاقة">
            <select className={field} value={v.creditCardId} onChange={(e) => set("creditCardId", e.target.value)}>
              <option value="">— choose —</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.name} ••{c.lastFour}</option>)}
            </select>
          </F>
        )}
        <F label="Notes · ملاحظات" wide><input className={field} value={v.notes} onChange={(e) => set("notes", e.target.value)} /></F>
        <div className="sm:col-span-2">
          <AttachmentField value={file} onChange={setFile} label={isDaily ? "Proof of payment (photo) · صورة إثبات الدفع" : "Invoice / supporting file · الفاتورة والمرفقات"} />
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto text-sm text-slate-600">Total: <b className="text-slate-900">{formatAed(total)}</b></div>
        <Link href="/admin/expenses" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save expense"}
        </button>
      </div>
    </div>
  );
}
