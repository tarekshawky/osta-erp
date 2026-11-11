"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { saveInvoiceTerms, resetInvoiceTerms } from "./actions";
import { DAYS_TOKEN, MAX_TERMS, type InvoiceTermsConfig, type TermPair } from "@/lib/invoiceTerms";

type ListKey = "general" | "warranty";

const SECTIONS: { key: ListKey; title: string; hint: string }[] = [
  {
    key: "general",
    title: "Terms & Conditions",
    hint: `The numbered terms at the bottom of every invoice. Write ${DAYS_TOKEN} where the warranty days should appear; a term that uses it is shown only on invoices that have a warranty.`,
  },
  {
    key: "warranty",
    title: "Warranty Terms & Conditions",
    hint: "Shown only on invoices that have a warranty (With Warranty), above the Terms & Conditions.",
  },
];

export function InvoiceTermsEditor({ initial, isDefault }: { initial: InvoiceTermsConfig; isDefault: boolean }) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<InvoiceTermsConfig>(initial);
  const [usingDefault, setUsingDefault] = useState(isDefault);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(key: ListKey, next: TermPair[]) {
    setConfig((c) => ({ ...c, [key]: next }));
  }
  const edit = (key: ListKey, i: number, patch: Partial<TermPair>) => change(key, config[key].map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const remove = (key: ListKey, i: number) => change(key, config[key].filter((_, j) => j !== i));
  const add = (key: ListKey) => change(key, [...config[key], { en: "", ar: "" }]);
  function move(key: ListKey, i: number, by: -1 | 1) {
    const list = [...config[key]];
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    change(key, list);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveInvoiceTerms(config);
      if (res.ok) {
        setUsingDefault(false);
        showToast("Invoice terms saved.");
      } else setError(res.error ?? "Could not save.");
    });
  }

  function reset() {
    if (!window.confirm("Go back to the original wording? Your own terms will be replaced.")) return;
    setError(null);
    startTransition(async () => {
      const res = await resetInvoiceTerms();
      if (res.ok) {
        window.location.reload();
      } else setError(res.error ?? "Could not reset.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((section) => (
        <div key={section.key} className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">{section.title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{section.hint}</p>

          <div className="mt-4 flex flex-col gap-4">
            {config[section.key].map((term, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-700">
                    {section.key === "general" ? `Term ${i + 1}` : `Paragraph ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <button type="button" disabled={i === 0} onClick={() => move(section.key, i, -1)} className="rounded border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" disabled={i === config[section.key].length - 1} onClick={() => move(section.key, i, 1)} className="rounded border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-30">
                      ↓
                    </button>
                    <button type="button" onClick={() => remove(section.key, i)} className="rounded border border-red-200 px-2 py-1 text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">English</label>
                    <textarea rows={3} className={inputClassName} value={term.en} onChange={(e) => edit(section.key, i, { en: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">العربية</label>
                    <textarea rows={3} dir="rtl" className={inputClassName} value={term.ar} onChange={(e) => edit(section.key, i, { ar: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
            {config[section.key].length === 0 && <p className="text-sm text-slate-400">No terms. Nothing is printed for this section.</p>}
          </div>

          <button
            type="button"
            disabled={config[section.key].length >= MAX_TERMS}
            onClick={() => add(section.key)}
            className="mt-4 w-full rounded-xl border border-dashed border-blue-300 text-blue-700 text-sm font-medium py-2.5 disabled:opacity-40"
          >
            + Add {section.key === "general" ? "term" : "paragraph"}
          </button>
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={save} className="rounded-xl bg-blue-700 disabled:opacity-60 text-white font-medium text-sm px-6 py-3">
          {pending ? "Saving..." : "Save terms"}
        </button>
        {!usingDefault && (
          <button type="button" disabled={pending} onClick={reset} className="rounded-xl border border-slate-200 text-slate-700 text-sm font-medium px-5 py-3">
            Reset to original wording
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Changes apply to every invoice you open or print from now on, including older ones: an invoice always shows the current terms.
      </p>
    </div>
  );
}
