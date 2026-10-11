"use client";

import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveRuleSet, type RuleSetInput } from "@/app/admin/pricing/actions";
import { priceQuote, validateTiers } from "@/lib/pricing/priceQuote";
import { aedToFils, filsToAed } from "@/lib/pricing/money";

export type RuleSetRow = RuleSetInput & { id: string | null; services: string[] };

function Preview({ tiers }: { tiers: RuleSetInput["tiers"] }) {
  const [unit, setUnit] = useState("100");
  const parsed = useMemo(() => {
    const t = tiers.map((x) => ({
      minQty: Number(x.minQty),
      maxQty: x.maxQty.trim() === "" ? null : Number(x.maxQty),
      percent: Number(x.percent),
    }));
    return t.every((x) => Number.isInteger(x.minQty) && !isNaN(x.percent) && (x.maxQty === null || Number.isInteger(x.maxQty))) ? t : null;
  }, [tiers]);
  const unitFils = aedToFils(unit);
  if (!parsed || unitFils === null) return <p className="text-xs text-slate-400">Fill in valid tiers and a unit price to preview.</p>;

  const top = Math.max(1, ...parsed.map((t) => t.maxQty ?? t.minQty));
  const rows = Array.from({ length: Math.min(top + 2, 25) }, (_, i) => i + 1).map((q) => {
    const quote = priceQuote({ unitPriceFils: unitFils, quantity: q, tiers: parsed, bookingFeeFils: 0, vat: { ratePercent: 0, pricesIncludeVat: true } });
    return { q, quote };
  });
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        Preview with unit price (AED)
        <input className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </label>
      <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Qty</th>
              <th className="px-3 py-1.5 text-right">Discount</th>
              <th className="px-3 py-1.5 text-right">Total (AED)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ q, quote }) => (
              <tr key={q} className="border-t border-slate-100">
                <td className="px-3 py-1.5">{q}</td>
                <td className="px-3 py-1.5 text-right">{quote.discountPercent}%</td>
                <td className="px-3 py-1.5 text-right font-medium">{filsToAed(quote.serviceNetFils)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RuleSetCard({ initial }: { initial: RuleSetRow }) {
  const { showToast } = useToast();
  const [v, setV] = useState<RuleSetInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const liveErrors = useMemo(() => {
    const t = v.tiers.map((x) => ({ minQty: Number(x.minQty), maxQty: x.maxQty.trim() === "" ? null : Number(x.maxQty), percent: Number(x.percent) }));
    return t.some((x) => isNaN(x.minQty) || isNaN(x.percent)) ? [] : validateTiers(t);
  }, [v.tiers]);

  function setTier(i: number, patch: Partial<RuleSetInput["tiers"][number]>) {
    setV((s) => ({ ...s, tiers: s.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));
  }
  function addTier() {
    const last = v.tiers[v.tiers.length - 1];
    const nextMin = last && last.maxQty.trim() !== "" ? String(Number(last.maxQty) + 1) : "";
    setV((s) => ({ ...s, tiers: [...s.tiers, { minQty: nextMin, maxQty: nextMin, percent: "" }] }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveRuleSet(initial.id, v);
      if (res.ok) showToast("Discount rules saved.");
      else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Rule set name">
          <input className={inputClassName} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Starts (optional)">
          <input type="date" className={inputClassName} value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} />
        </Field>
        <Field label="Ends (optional)">
          <input type="date" className={inputClassName} value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} />
        </Field>
      </div>
      {initial.services.length > 0 && <p className="mt-2 text-xs text-slate-400">Used by: {initial.services.join(", ")}</p>}

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
            <span>From qty</span>
            <span>To qty (empty = no limit)</span>
            <span>Discount %</span>
            <span />
          </div>
          <div className="flex flex-col gap-2">
            {v.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input className={inputClassName} inputMode="numeric" value={t.minQty} onChange={(e) => setTier(i, { minQty: e.target.value })} />
                <input className={inputClassName} inputMode="numeric" value={t.maxQty} onChange={(e) => setTier(i, { maxQty: e.target.value })} />
                <input className={inputClassName} inputMode="decimal" value={t.percent} onChange={(e) => setTier(i, { percent: e.target.value })} />
                <button type="button" onClick={() => setV((s) => ({ ...s, tiers: s.tiers.filter((_, idx) => idx !== i) }))} className="px-2 text-sm text-red-600">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addTier} className="mt-3 text-sm font-medium text-blue-600">
            + Add tier
          </button>
          {liveErrors.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-xs text-amber-700">
              {liveErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Quantity above the highest tier gets no discount unless you add a tier with an empty &quot;To qty&quot;.
          </p>
        </div>
        <Preview tiers={v.tiers} />
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
          Active
        </label>
        <button type="button" disabled={pending} onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : initial.id ? "Save rules" : "Create rule set"}
        </button>
      </div>
    </div>
  );
}

export function DiscountEditor({ ruleSets }: { ruleSets: RuleSetRow[] }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      {ruleSets.map((r) => (
        <RuleSetCard key={r.id} initial={r} />
      ))}
      {creating ? (
        <RuleSetCard initial={{ id: null, name: "", active: true, startsAt: "", endsAt: "", tiers: [{ minQty: "1", maxQty: "1", percent: "0" }], services: [] }} />
      ) : (
        <button type="button" onClick={() => setCreating(true)} className="self-start text-sm font-medium text-blue-600">
          + New rule set
        </button>
      )}
    </div>
  );
}
