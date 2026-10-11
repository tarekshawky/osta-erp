"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { addOrderEvent, raiseVisitFeeCharge, ORDER_EVENT_TYPES } from "@/app/admin/orders/pricing-actions";

export type PricingLine = { label: string; value: string; strong?: boolean };
export type EventRow = { id: string; type: string; note: string; actor: string; at: string };
export type ChargeRowData = { id: string; status: string; reason: string; amountAed: string; evidence: string };

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Order created",
  CONFIRMED: "Confirmed",
  DISPATCHED: "Team dispatched",
  ARRIVED: "Team arrived",
  COMPLETED: "Completed",
  NO_ANSWER: "Customer did not answer",
  CANCELLED_BY_CUSTOMER: "Cancelled by customer",
  CANCELLED_BY_COMPANY: "Cancelled by company",
  TEAM_NO_SHOW: "Team did not show up",
  VISIT_FEE_RAISED: "Visit fee raised",
};

const REASON_LABEL: Record<string, string> = {
  CUSTOMER_REFUSED: "Customer refused the team or the service",
  UNREACHABLE: "Customer unreachable / no answer on arrival",
  CANCELLED_AFTER_DISPATCH: "Customer cancelled after the team was dispatched",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-600",
};

export function OrderPricingPanel({
  orderId,
  summary,
  lines,
  consentAt,
  policyVersion,
  events,
  charges,
  policyReasons,
  canRaiseFee,
  dispatched,
}: {
  orderId: string;
  summary: string | null;
  lines: PricingLine[];
  consentAt: string | null;
  policyVersion: number | null;
  events: EventRow[];
  charges: ChargeRowData[];
  policyReasons: string[];
  canRaiseFee: boolean;
  dispatched: boolean;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [eventType, setEventType] = useState("DISPATCHED");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState(policyReasons[0] ?? "");
  const [evidence, setEvidence] = useState("");
  const [feeError, setFeeError] = useState<string | null>(null);

  const eventOptions = (ORDER_EVENT_TYPES as readonly string[]).filter((t) => !(t === "DISPATCHED" && dispatched));

  function addEvent() {
    startTransition(async () => {
      const res = await addOrderEvent(orderId, eventType, note);
      if (res.ok) {
        showToast("Timeline updated.");
        setNote("");
      } else showToast(res.error ?? "Could not add.", "error");
    });
  }

  function raiseFee() {
    setFeeError(null);
    startTransition(async () => {
      const res = await raiseVisitFeeCharge(orderId, reason, evidence);
      if (res.ok) {
        showToast("Visit fee sent for review.");
        setEvidence("");
      } else setFeeError(res.error ?? "Could not raise the fee.");
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      {lines.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase text-slate-500">Pricing snapshot</h3>
          {summary && <p className="mt-1 text-sm font-medium text-slate-900">{summary}</p>}
          <div className="mt-2 text-sm">
            {lines.map((l) => (
              <div key={l.label} className={`flex justify-between py-0.5 ${l.strong ? "mt-1 border-t border-slate-100 pt-1.5 font-bold text-slate-900" : "text-slate-600"}`}>
                <span>{l.label}</span>
                <span>{l.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Fixed when the order was created; later price edits never change it.
            {consentAt && ` Visit-fee policy v${policyVersion} accepted ${consentAt}.`}
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Timeline</h3>
        <ol className="mt-2 flex flex-col gap-2 text-sm">
          {events.length === 0 && <li className="text-slate-400">No events yet.</li>}
          {events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span className="text-slate-800">
                <b>{EVENT_LABEL[e.type] ?? e.type}</b>
                {e.note && <span className="text-slate-500"> · {e.note}</span>}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {e.actor && `${e.actor} · `}
                {e.at}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select className={inputClassName} value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {eventOptions.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABEL[t]}
              </option>
            ))}
          </select>
          <input className={inputClassName} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" disabled={pending} onClick={addEvent} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Add
          </button>
        </div>
      </section>

      {canRaiseFee && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase text-slate-500">Visit fee</h3>
          {charges.map((c) => (
            <div key={c.id} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{c.amountAed} AED · {REASON_LABEL[c.reason] ?? c.reason}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? ""}`}>{c.status.replace("_", " ")}</span>
              </div>
              {c.evidence && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{c.evidence}</p>}
            </div>
          ))}
          <p className="mt-3 text-xs text-slate-400">
            Never added at order creation. Allowed only after the team is dispatched, for a reason the customer accepted, and never when the company cancels or the team does not show up.
          </p>
          {!dispatched ? (
            <p className="mt-2 text-sm text-slate-500">Mark the team as dispatched first to enable this.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <select className={inputClassName} value={reason} onChange={(e) => setReason(e.target.value)}>
                {policyReasons.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABEL[r] ?? r}
                  </option>
                ))}
              </select>
              <textarea className={`${inputClassName} min-h-20`} placeholder="Evidence: notes, call log, photo references" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
              {feeError && <p className="text-sm text-red-500">{feeError}</p>}
              <button type="button" disabled={pending} onClick={raiseFee} className="self-start rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">
                Raise visit fee for review
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
