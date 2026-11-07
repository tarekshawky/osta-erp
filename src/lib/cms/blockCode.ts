// Custom CSS and JavaScript for one block (Advanced tab). Like the page-level code, it runs on visitors' browsers, so only the
// Owner (integrations.manage) may add or change it, and the audit log records that it changed, never the code itself.
//   - CSS is scoped to the block: the site writes  [data-blk="<block id>"] { <your CSS> }  using native CSS nesting, so plain
//     declarations (color: red;) and nested rules (h2 { … }  or  & a { … }) only ever affect this block.
//   - JavaScript runs after the page loads, once the visitor has allowed what it needs (same cookie choices as page code), with
//     `block` set to the block's element.

export const MAX_BLOCK_CODE_CHARS = 10_000;

export const BLOCK_JS_CONSENT = [
  { value: "always", label: "Always (no cookie consent needed)" },
  { value: "analytics", label: "After the visitor allows Analytics cookies" },
  { value: "marketing", label: "After the visitor allows Marketing cookies" },
] as const;
export type BlockJsConsent = (typeof BLOCK_JS_CONSENT)[number]["value"];

// Things that have no place in a block's stylesheet: markup that could end the <style> element early, remote stylesheets, and
// the old script-in-CSS tricks.
const FORBIDDEN_CSS: [RegExp, string][] = [
  [/</, "CSS cannot contain “<”."],
  [/@import\b/i, "@import is not allowed. Put the rules here directly."],
  [/@charset\b/i, "@charset is not needed here."],
  [/javascript\s*:/i, "javascript: is not allowed in CSS."],
  [/expression\s*\(/i, "expression() is not allowed in CSS."],
  [/behaviou?r\s*:|-moz-binding/i, "behavior / -moz-binding are not allowed in CSS."],
];

export function cssProblem(css: string): string | null {
  if (css.length > MAX_BLOCK_CODE_CHARS) return `Custom CSS can hold up to ${MAX_BLOCK_CODE_CHARS.toLocaleString()} characters.`;
  for (const [re, msg] of FORBIDDEN_CSS) if (re.test(css)) return msg;
  // Unbalanced braces would let the rules spill out of this block's scope (or swallow the rest of the page's CSS).
  let depth = 0, paren = 0;
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "")) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "(") paren++;
    else if (ch === ")") paren--;
    if (depth < 0) return "There is a “}” without a matching “{”.";
    if (paren < 0) return "There is a “)” without a matching “(”.";
  }
  if (depth !== 0) return "A “{” is never closed.";
  if (paren !== 0) return "A “(” is never closed.";
  return null;
}

export function jsProblem(js: string): string | null {
  if (js.length > MAX_BLOCK_CODE_CHARS) return `Custom JavaScript can hold up to ${MAX_BLOCK_CODE_CHARS.toLocaleString()} characters.`;
  if (/<\/script/i.test(js) || /<!--/.test(js)) return "JavaScript cannot contain “</script” or “<!--”.";
  return null;
}

export function jsWarnings(js: string): string[] {
  const w: string[] = [];
  if (/document\.write\s*\(/i.test(js)) w.push("document.write does nothing here: the code runs after the page has loaded.");
  if (/\beval\s*\(|new\s+Function\s*\(/.test(js)) w.push("eval and new Function are blocked by the site's security policy.");
  return w;
}

export type BlockCode = { css: string; js: string; consent: string };
export const EMPTY_CODE: BlockCode = { css: "", js: "", consent: "analytics" };

export function codeOf(props: unknown): BlockCode {
  const s = (props as { style?: { customCss?: unknown; customJs?: unknown; customJsConsent?: unknown } } | null)?.style;
  return {
    css: typeof s?.customCss === "string" ? s.customCss : "",
    js: typeof s?.customJs === "string" ? s.customJs : "",
    consent: typeof s?.customJsConsent === "string" ? s.customJsConsent : "analytics",
  };
}

export const hasCode = (props: unknown) => {
  const c = codeOf(props);
  return !!(c.css.trim() || c.js.trim());
};

type B = { id?: unknown; props?: unknown };

// Blocks whose custom code is new or different compared with what was stored (matched by block id). Removing code is a change
// too, but only adding or editing it needs the Owner, so `removedOnly` ones are not reported.
export function changedCodeBlocks(next: B[], previous: unknown): string[] {
  const before = new Map<string, BlockCode>();
  if (Array.isArray(previous)) for (const b of previous as B[]) if (typeof b?.id === "string") before.set(b.id, codeOf(b.props));
  const out: string[] = [];
  for (const b of next) {
    if (typeof b?.id !== "string" || !hasCode(b.props)) continue;
    const now = codeOf(b.props);
    const was = before.get(b.id);
    // `consent` only matters while there is JavaScript.
    const same = !!was && was.css === now.css && was.js === now.js && (!now.js.trim() || was.consent === now.consent);
    if (!same) out.push(b.id);
  }
  return out;
}

export const OWNER_ONLY_MESSAGE = "Custom CSS and JavaScript can only be added or changed by the owner. Remove the custom code from this block, or ask the owner to add it.";
