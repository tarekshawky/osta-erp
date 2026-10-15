// Rich text for block fields written in the visual editor. Stored as a small, safe subset of HTML. Older fields hold
// plain text with [words](address){flags} links; those keep working (see isRichHtml) until someone edits them in the
// visual editor. Pure code (no DOM, no dependencies) so the admin forms, the server and the tests all share it.
// This file is shared (copied) between the admin and the public site: keep the two identical.

const BLOCK_TAG = /^\s*<(p|h[1-6]|ul|ol|blockquote|hr|div)[\s>/]/i;

// True when the value was written by the visual editor (HTML) rather than as plain text with [link](url) markup.
export const isRichHtml = (v: string | null | undefined): boolean => !!v && BLOCK_TAG.test(v);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");
const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

// ---- sanitizer: rebuilds the HTML from an allow-list; anything else is dropped or shown as plain text ----

const SAFE_URL = /^(\/(?!\/)|https:\/\/|tel:|mailto:)/;
const SAFE_IMG = /^(\/(?!\/)|https:\/\/)/;
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
const FONT_SIZE = /^(\d{1,3}(\.\d{1,2})?)(px|rem|em)$/;
const LINE_HEIGHT = /^(\d(\.\d{1,2})?)$/;
const ALIGN = new Set(["start", "end", "left", "right", "center", "justify"]);

const VOID_TAGS = new Set(["br", "hr", "img"]);
const TAGS = new Set(["p", "br", "hr", "h2", "h3", "h4", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "a", "span", "mark", "img"]);
// Tags that are renamed rather than dropped (the editor and pasted content use these).
const RENAME: Record<string, string> = { b: "strong", i: "em", strike: "s", del: "s", h1: "h2", h5: "h4", h6: "h4", div: "p" };
const STYLED = new Set(["p", "h2", "h3", "h4", "li", "blockquote", "span", "mark"]);
// Whole elements whose content must never survive.
const DROP_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "textarea", "title"]);

function cleanStyle(raw: string): string {
  const out: string[] = [];
  for (const decl of decode(raw).split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim().toLowerCase().replace(/\s*!important$/, "");
    if ((prop === "color" || prop === "background-color") && COLOR.test(val)) out.push(`${prop}:${val}`);
    else if (prop === "font-size" && FONT_SIZE.test(val) && parseFloat(val) >= 0.5 && parseFloat(val) <= 200) out.push(`${prop}:${val}`);
    else if (prop === "line-height" && LINE_HEIGHT.test(val) && parseFloat(val) >= 0.8 && parseFloat(val) <= 3) out.push(`${prop}:${val}`);
    else if (prop === "text-align" && ALIGN.has(val)) out.push(`${prop}:${val}`);
  }
  return out.join(";");
}

function readAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function openTag(tag: string, a: Record<string, string>): string {
  let out = `<${tag}`;
  if (tag === "a") {
    const href = (a.href ?? "").trim();
    if (!SAFE_URL.test(href) || /[\s\u0000-\u001f]/.test(href)) return "";
    out += ` href="${escAttr(href)}"`;
    if (a.target === "_blank") out += ' target="_blank" rel="noopener noreferrer"';
  } else if (tag === "img") {
    const src = (a.src ?? "").trim();
    if (!SAFE_IMG.test(src) || /[\s\u0000-\u001f]/.test(src)) return "";
    out += ` src="${escAttr(src)}" alt="${escAttr((a.alt ?? "").slice(0, 500))}" loading="lazy"`;
    for (const k of ["width", "height"] as const) if (/^\d{1,4}$/.test(a[k] ?? "")) out += ` ${k}="${a[k]}"`;
  } else {
    if (STYLED.has(tag) && a.style) {
      const style = cleanStyle(a.style);
      if (style) out += ` style="${escAttr(style)}"`;
    }
    if ((tag === "p" || /^h[2-4]$/.test(tag) || tag === "li" || tag === "blockquote") && (a.dir === "rtl" || a.dir === "ltr")) out += ` dir="${a.dir}"`;
  }
  return `${out}>`;
}

export function sanitizeRichHtml(html: string): string {
  const out: string[] = [];
  const open: string[] = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let last = 0;
  let skipUntil: string | null = null; // inside a dropped element
  const text = (s: string) => {
    if (!skipUntil && s) out.push(esc(decode(s).replace(/\u0000/g, "")));
  };
  for (const m of html.matchAll(re)) {
    text(html.slice(last, m.index));
    last = m.index! + m[0].length;
    if (m[0].startsWith("<!--")) continue;
    const closing = m[1] === "/";
    const raw = m[2].toLowerCase();
    if (skipUntil) {
      if (closing && raw === skipUntil) skipUntil = null;
      continue;
    }
    if (DROP_CONTENT.has(raw)) {
      if (!closing && !m[3].trimEnd().endsWith("/")) skipUntil = raw;
      continue;
    }
    const tag = RENAME[raw] ?? raw;
    if (!TAGS.has(tag)) continue; // unknown tag: drop the tag, keep its text
    if (closing) {
      if (VOID_TAGS.has(tag)) continue;
      const at = open.lastIndexOf(tag);
      if (at < 0) continue;
      while (open.length > at) out.push(`</${open.pop()}>`);
      continue;
    }
    const opened = openTag(tag, readAttrs(m[3]));
    if (!opened) continue;
    out.push(opened);
    if (!VOID_TAGS.has(tag)) open.push(tag);
  }
  text(html.slice(last));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("");
}

// What gets stored: HTML is sanitized; plain text is returned untouched.
export const cleanRichValue = (v: string): string => (isRichHtml(v) ? sanitizeRichHtml(v) : v);

// ---- conversions ----

const LINK_TOKEN = /\[([^\]\n]{1,2000})\]\(([^)\s]{1,2000})\)(?:\{([a-z,]{1,12})\})?/g;

// Plain text with [words](address){flags} links -> editor HTML (blank line = new paragraph, single line break kept).
export function plainToRichHtml(plain: string): string {
  const inline = (s: string) => {
    let out = "";
    let last = 0;
    for (const m of s.matchAll(LINK_TOKEN)) {
      const [whole, label, url, flags = ""] = m;
      if (!SAFE_URL.test(url)) continue;
      out += esc(s.slice(last, m.index)).replace(/\n/g, "<br>");
      const f = new Set(flags.split(",").filter(Boolean));
      let inner = esc(label);
      if (f.has("b")) inner = `<strong>${inner}</strong>`;
      if (f.has("u")) inner = `<u>${inner}</u>`;
      out += `<a href="${escAttr(url)}"${f.has("n") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${inner}</a>`;
      last = m.index! + whole.length;
    }
    return out + esc(s.slice(last)).replace(/\n/g, "<br>");
  };
  const paras = plain.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paras.map((p) => `<p>${inline(p)}</p>`).join("");
}

// Visible words of an HTML value (tags removed, block ends become spaces) for word counts, snippets and SEO checks.
export function richToText(html: string): string {
  return decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|h[1-6]|li|blockquote|div|ul|ol)>|<br\s*\/?>|<hr\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

// An editor value that has no visible content (an empty paragraph) is stored as "".
export function isEmptyRich(html: string): boolean {
  return !/<img\b|<hr\b/i.test(html) && richToText(html) === "";
}
