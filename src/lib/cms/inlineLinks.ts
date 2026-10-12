// Links inside block text. Written in the editor as  [link text](address){flags}  and drawn by the public site as a real
// link. Flags (optional, comma separated): b = bold, t = thin, u = underline, n = open in a new tab. Without n a link
// opens in the same tab. This file is shared (copied) between the admin and the public site.
//
//   [Book now](/pricing){b,u}      [Call us](tel:+971500000000)      [Guide](https://example.com){n}

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; url: string; bold: boolean; thin: boolean; underline: boolean; newTab: boolean };

const TOKEN = /\[([^\]\n]{1,200})\]\(([^)\s]{1,2000})\)(?:\{([a-z,]{1,12})\})?/g;

// Site paths, https://, tel: and mailto: only: never javascript: or data:.
export const isSafeLinkUrl = (url: string) => /^(\/(?!\/)|https:\/\/|tel:|mailto:)/.test(url);

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    const [whole, text, url, flags = ""] = m;
    if (!isSafeLinkUrl(url)) continue; // left as plain text, never turned into a link
    if (m.index! > last) out.push({ kind: "text", text: src.slice(last, m.index) });
    const f = new Set(flags.split(",").filter(Boolean));
    out.push({ kind: "link", text, url, bold: f.has("b"), thin: f.has("t") && !f.has("b"), underline: f.has("u"), newTab: f.has("n") });
    last = m.index! + whole.length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

// The text without link markup (for word counts, search snippets and structured data).
export const stripInline = (src: string) => parseInline(src).map((p) => p.text).join("");

// True when some [text](address) in the string points somewhere that is not allowed.
export function hasUnsafeInlineLink(src: string): boolean {
  for (const m of src.matchAll(TOKEN)) if (!isSafeLinkUrl(m[2])) return true;
  return false;
}

export function buildLinkToken(o: { text: string; url: string; bold?: boolean; thin?: boolean; underline?: boolean; newTab?: boolean }): string | null {
  const text = o.text.trim();
  const url = o.url.trim();
  if (!text || /[\]\n]/.test(text) || text.length > 200) return null;
  if (!isSafeLinkUrl(url) || /[)\s]/.test(url)) return null;
  const flags = [o.bold && "b", o.thin && !o.bold && "t", o.underline && "u", o.newTab && "n"].filter(Boolean).join(",");
  return `[${text}](${url})${flags ? `{${flags}}` : ""}`;
}
