"use client";

import { createContext, useContext, useState } from "react";
import { inputClassName } from "@/components/FormField";
import { buildLinkToken, findPlainOccurrence, parseInline } from "@/lib/cms/inlineLinks";

export type LinkTarget = { group: string; label: string; url: string };

// Pages the editor can link to (built-in site pages and published pages), provided once by the page builder.
export const LinkTargetsContext = createContext<LinkTarget[]>([]);

type Props = { textareaRef: React.RefObject<HTMLTextAreaElement | null>; value: string; onValue: (next: string) => void };

// "Link" button for a text box: asks for the words, the address and the style, then inserts [words](address){flags}
// where the cursor / selection is. Links open in the same tab unless "Open in a new tab" is ticked.
export function LinkInserter({ textareaRef, value, onValue }: Props) {
  const targets = useContext(LinkTargetsContext);
  const groups = [...new Set(targets.map((t) => t.group))];
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const [hadSelection, setHadSelection] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [bold, setBold] = useState(false);
  const [thin, setThin] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [newTab, setNewTab] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPanel() {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    setRange({ start, end });
    setHadSelection(end > start);
    setText(value.slice(start, end));
    setUrl("");
    setBold(false);
    setThin(false);
    setUnderline(false);
    setNewTab(false);
    setError(null);
    setOpen(true);
  }

  function insert() {
    const token = buildLinkToken({ text, url, bold, thin, underline, newTab });
    if (!token) return setError("Enter the link words and an address: a site path like /pricing, https://…, tel: or mailto:.");
    let { start, end } = range;
    // Nothing was selected: if these words are already in the text, link them there instead of adding them a second time.
    if (start === end) {
      const found = findPlainOccurrence(value, text);
      if (found) ({ start, end } = found);
    }
    onValue(value.slice(0, start) + token + value.slice(end));
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={openPanel} className="self-start text-xs font-medium text-blue-600">
        🔗 Add a link
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-slate-700">
      <label className="flex flex-col gap-1">
        <span className="font-medium">Words to show</span>
        <input className={inputClassName} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. our pricing page" />
        <span className="text-slate-500">
          {hadSelection
            ? "The words you selected become the link."
            : "Nothing selected: if these words are already in the text they become the link; otherwise they are added at the cursor."}
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Choose a page</span>
        <select className={inputClassName} value="" onChange={(e) => e.target.value && setUrl(e.target.value)}>
          <option value="">Choose a page…</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {targets.filter((t) => t.group === g).map((t) => <option key={t.url} value={t.url}>{t.label} ({t.url})</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">…or type the address</span>
        <input className={inputClassName} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/pricing, https://…, tel:+971…, mailto:…" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={bold} onChange={(e) => { setBold(e.target.checked); if (e.target.checked) setThin(false); }} /> <b>Bold</b></label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={thin} disabled={bold} onChange={(e) => setThin(e.target.checked)} /> <span className="font-light">Thin</span></label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={underline} onChange={(e) => setUnderline(e.target.checked)} /> <u>Underline</u></label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} /> Open in a new tab</label>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={insert} className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white">Insert link</button>
        <button type="button" onClick={() => setOpen(false)} className="font-medium text-slate-500">Cancel</button>
      </div>
    </div>
  );
}

// How the text will look on the site: links are shown with their bold / thin / underline style, so it is clear which
// words are linked. Shown under a text box only when the text contains a link.
export function LinkPreview({ text }: { text: string }) {
  const parts = parseInline(text);
  if (!parts.some((p) => p.kind === "link")) return null;
  return (
    <p className="whitespace-pre-line rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
      <span className="mr-1 font-semibold text-slate-400">Preview:</span>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <span key={i}>{p.text}</span>
        ) : (
          <span key={i} title={p.url} className={`text-blue-600 ${p.bold ? "font-bold" : p.thin ? "font-light" : ""} ${p.underline ? "underline underline-offset-4" : ""}`}>
            {p.text}{p.newTab ? " ↗" : ""}
          </span>
        )
      )}
    </p>
  );
}
