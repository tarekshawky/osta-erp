"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { deleteOption, moveOption, saveOption } from "@/app/admin/pricing/actions";

export type OptionItem = { id: string; nameEn: string; nameAr: string; active: boolean; noteEn: string; noteAr: string };

// The choices of one service (e.g. a gas refill: Quarter kg / Half kg / 1 kg). Names are edited here; the price of each
// option in each emirate is entered in the "Prices by emirate" table above (the option rows appear under the service).
export function OptionsEditor({ serviceId, options }: { serviceId: string; options: OptionItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<Record<string, OptionItem>>(Object.fromEntries(options.map((o) => [o.id, o])));
  const [adding, setAdding] = useState({ nameEn: "", nameAr: "", noteEn: "", noteAr: "" });
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (ok) showToast(ok);
        router.refresh();
      } else showToast(r.error ?? "Something went wrong.", "error");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Options (optional)</h4>
        <p className="text-xs text-slate-500">
          Use options when the price depends on a choice, for example a gas refill by weight: ¼ kg, ½ kg, 1 kg. The customer must pick one, and each option has its own price in each emirate (enter them in <b>Prices by emirate</b>). A service with options has no price of its own.
        </p>
      </div>

      {options.length === 0 && <p className="text-xs text-slate-400">No options: the service is priced as a whole.</p>}
      {options.map((o, i) => {
        const d = draft[o.id] ?? o;
        const dirty = d.nameEn !== o.nameEn || d.nameAr !== o.nameAr || d.active !== o.active || d.noteEn !== o.noteEn || d.noteAr !== o.noteAr;
        return (
          <div key={o.id} className={`flex flex-col gap-2 rounded-lg border border-slate-100 p-2.5 ${o.active ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col text-xs text-slate-400">
              <button type="button" aria-label="Move up" disabled={pending || i === 0} onClick={() => run(() => moveOption(serviceId, o.id, "up"))} className="disabled:opacity-30">▲</button>
              <button type="button" aria-label="Move down" disabled={pending || i === options.length - 1} onClick={() => run(() => moveOption(serviceId, o.id, "down"))} className="disabled:opacity-30">▼</button>
            </div>
            <input className={`${inputClassName} w-40`} value={d.nameEn} placeholder="English" onChange={(e) => setDraft({ ...draft, [o.id]: { ...d, nameEn: e.target.value } })} />
            <input className={`${inputClassName} w-40`} dir="rtl" value={d.nameAr} placeholder="العربية" onChange={(e) => setDraft({ ...draft, [o.id]: { ...d, nameAr: e.target.value } })} />
            <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={d.active} onChange={(e) => setDraft({ ...draft, [o.id]: { ...d, active: e.target.checked } })} /> Active</label>
            {dirty && <button type="button" disabled={pending} onClick={() => run(() => saveOption(serviceId, o.id, { nameEn: d.nameEn, nameAr: d.nameAr, active: d.active, noteEn: d.noteEn, noteAr: d.noteAr }), "Option saved.")} className="text-xs font-semibold text-blue-600">Save</button>}
            <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the option “${o.nameEn}” and its prices? Past orders keep its name.`)) run(() => deleteOption(serviceId, o.id), "Option deleted."); }} className="ml-auto text-xs font-medium text-red-600">Delete</button>
            </div>
            <div className="flex flex-wrap gap-2 pl-5">
              <input className={`${inputClassName} min-w-48 flex-1`} value={d.noteEn} placeholder="Note under this option (English, optional)" maxLength={500} onChange={(e) => setDraft({ ...draft, [o.id]: { ...d, noteEn: e.target.value } })} />
              <input className={`${inputClassName} min-w-48 flex-1`} dir="rtl" value={d.noteAr} placeholder="ملاحظة تحت الخيار (عربي، اختياري)" maxLength={500} onChange={(e) => setDraft({ ...draft, [o.id]: { ...d, noteAr: e.target.value } })} />
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <input className={`${inputClassName} w-40`} value={adding.nameEn} placeholder="New option (English)" onChange={(e) => setAdding({ ...adding, nameEn: e.target.value })} />
        <input className={`${inputClassName} w-40`} dir="rtl" value={adding.nameAr} placeholder="خيار جديد (عربي)" onChange={(e) => setAdding({ ...adding, nameAr: e.target.value })} />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(async () => { const r = await saveOption(serviceId, null, { ...adding, active: true }); if (r.ok) setAdding({ nameEn: "", nameAr: "", noteEn: "", noteAr: "" }); return r; }, "Option added. Now enter its prices in Prices by emirate.")}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          + Add option
        </button>
      </div>
    </div>
  );
}
