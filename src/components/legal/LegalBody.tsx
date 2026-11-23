import { parseBody, parseInline, type Block } from "@/lib/legal/content";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((s, i) =>
        s.t === "bold" ? <strong key={i}>{s.text}</strong>
        : s.t === "link" ? <a key={i} href={s.href} className="font-medium text-blue-600 underline">{s.text}</a>
        : <span key={i}>{s.text}</span>)}
    </>
  );
}

// A {{field}} that has not been filled in yet shows as a highlighted marker, so the editor can see what is still open.
function Marked({ text }: { text: string }) {
  const parts = text.split(/(\{\{\s*[a-z0-9_]+\s*\}\})/gi);
  return <>{parts.map((p, i) => (/^\{\{/.test(p) ? <mark key={i} className="rounded bg-amber-100 px-1 text-amber-800">{p}</mark> : <Inline key={i} text={p} />))}</>;
}

export function LegalBody({ text }: { text: string }) {
  const blocks: Block[] = parseBody(text);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {blocks.map((b, i) =>
        b.t === "p" ? <p key={i}><Marked text={b.text} /></p>
        : b.t === "h" ? <h4 key={i} className="pt-1 font-semibold text-slate-900"><Marked text={b.text} /></h4>
        : b.t === "notice" ? <p key={i} className="rounded-lg border-s-4 border-amber-400 bg-amber-50 p-3 text-amber-900"><Marked text={b.text} /></p>
        : b.t === "ul" ? <ul key={i} className="list-disc space-y-1 ps-5">{b.items.map((it, j) => <li key={j}><Marked text={it} /></li>)}</ul>
        : b.t === "ol" ? <ol key={i} className="list-decimal space-y-1 ps-5">{b.items.map((it, j) => <li key={j}><Marked text={it} /></li>)}</ol>
        : (
          <div key={i} className="overflow-x-auto"><table className="w-full border border-slate-200 text-start text-sm">
            <thead className="bg-slate-50"><tr>{b.rows[0].map((c, j) => <th key={j} className="border border-slate-200 px-3 py-2 text-start font-semibold">{c}</th>)}</tr></thead>
            <tbody>{b.rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} className="border border-slate-200 px-3 py-2">{c}</td>)}</tr>)}</tbody>
          </table></div>
        ))}
    </div>
  );
}
