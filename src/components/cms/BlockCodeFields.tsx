"use client";

import { inputClassName } from "@/components/FormField";
import { BLOCK_JS_CONSENT, MAX_BLOCK_CODE_CHARS, cssProblem, jsProblem, jsWarnings } from "@/lib/cms/blockCode";

type Style = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

// Custom CSS and JavaScript for one block. Only the owner can add or change them; other admins see whether code exists and can
// remove it (the server enforces the same rule, so this is only about showing the right thing).
export function BlockCodeFields({ style, onChange, canEdit }: { style: Style; onChange: (s: Style) => void; canEdit: boolean }) {
  const css = str(style.customCss);
  const js = str(style.customJs);
  const set = (patch: Style) => {
    const next = { ...style, ...patch };
    // Empty code is stored as nothing.
    for (const k of ["customCss", "customJs"]) if (next[k] === "") delete next[k];
    onChange(next);
  };

  if (!canEdit) {
    const has = css.trim() || js.trim();
    return (
      <fieldset className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
        <legend className="px-1 text-xs font-semibold text-slate-500">Custom CSS &amp; JavaScript</legend>
        <p>Custom code can only be added or changed by the owner.</p>
        {has ? (
          <p className="mt-2">
            This block has custom {[css.trim() && "CSS", js.trim() && "JavaScript"].filter(Boolean).join(" and ")}. It stays as it is while you edit the rest.{" "}
            <button type="button" onClick={() => set({ customCss: "", customJs: "" })} className="font-medium text-red-600">Remove it</button>
          </p>
        ) : null}
      </fieldset>
    );
  }

  const cssErr = css ? cssProblem(css) : null;
  const jsErr = js ? jsProblem(js) : null;
  const warn = js ? jsWarnings(js) : [];
  const mono = `${inputClassName} min-h-36 font-mono text-xs leading-relaxed`;
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <legend className="px-1 text-xs font-semibold text-amber-800">Custom CSS &amp; JavaScript (owner only)</legend>
      <p className="text-xs text-slate-500">This code runs on your visitors&apos; browsers. Add only code you trust. It affects this block only; the audit log records that it changed, not the code.</p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Custom CSS</span>
        <textarea className={mono} dir="ltr" spellCheck={false} maxLength={MAX_BLOCK_CODE_CHARS} value={css} onChange={(e) => set({ customCss: e.target.value })} placeholder={"h2 { color: #ff6600; }\n& a { text-decoration: underline; }"} />
        <span className="text-[11px] text-slate-400">Applies only inside this block. Write rules like <code>h2 {"{ … }"}</code>, or <code>&amp; a {"{ … }"}</code> where <code>&amp;</code> is the block itself, or plain declarations like <code>padding: 2rem;</code>.</span>
        {cssErr && <span role="alert" className="text-xs text-red-600">{cssErr}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Custom JavaScript</span>
        <textarea className={mono} dir="ltr" spellCheck={false} maxLength={MAX_BLOCK_CODE_CHARS} value={js} onChange={(e) => set({ customJs: e.target.value })} placeholder={"block.querySelector('h2')?.classList.add('is-ready');"} />
        <span className="text-[11px] text-slate-400">Runs after the page loads, each time this block appears. <code>block</code> is this block&apos;s element. Write the code only, without <code>&lt;script&gt;</code> tags.</span>
        {jsErr && <span role="alert" className="text-xs text-red-600">{jsErr}</span>}
        {warn.map((w) => <span key={w} className="text-xs text-amber-700">{w}</span>)}
      </label>

      {js.trim() && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">When the JavaScript may run</span>
          <select className={inputClassName} value={str(style.customJsConsent) || "analytics"} onChange={(e) => set({ customJsConsent: e.target.value })}>
            {BLOCK_JS_CONSENT.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
