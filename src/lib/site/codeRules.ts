// Custom code (raw HTML snippets) for every page or for one page. Owner only. The site adds it to <head> or the end of
// <body> in the visitor's browser, after the visitor has allowed what the snippet needs.

export const CODE_CONSENT = [
  { value: "always", label: "Always (no cookie consent needed, e.g. a site-verification tag)" },
  { value: "analytics", label: "After the visitor allows Analytics cookies" },
  { value: "marketing", label: "After the visitor allows Marketing cookies" },
] as const;
export type CodeConsent = (typeof CODE_CONSENT)[number]["value"];
export const isCodeConsent = (v: unknown): v is CodeConsent => CODE_CONSENT.some((c) => c.value === v);

export const MAX_CODE_CHARS = 50_000;

export type CodeInput = { headCode: string; headCodeConsent: string; bodyCode: string; bodyCodeConsent: string };

export function codeProblem(c: CodeInput): string | null {
  if (c.headCode.length > MAX_CODE_CHARS || c.bodyCode.length > MAX_CODE_CHARS) return `Each code box can hold up to ${MAX_CODE_CHARS.toLocaleString()} characters.`;
  if (!isCodeConsent(c.headCodeConsent) || !isCodeConsent(c.bodyCodeConsent)) return "Choose when each code box should load.";
  for (const [label, html] of [["Header", c.headCode], ["Footer", c.bodyCode]] as const) {
    // A snippet that opens a tag it never closes would swallow the rest of the page. Catch the common mistakes.
    const opens = (html.match(/<script\b/gi) ?? []).length;
    const closes = (html.match(/<\/script\s*>/gi) ?? []).length;
    if (opens !== closes) return `${label} code has ${opens} <script> tag(s) but ${closes} closing </script>. Check that every script is closed.`;
    if (/<\/?(html|head|body)\b/i.test(html)) return `${label} code must not contain <html>, <head> or <body> tags. Paste only the snippet.`;
  }
  return null;
}

// Advice shown next to the code boxes (never blocks saving).
export function codeWarnings(html: string): string[] {
  const w: string[] = [];
  if (/<script[^>]+src\s*=\s*["']?http:\/\//i.test(html)) w.push("A script loads from http:// (not https://). Browsers block it on a secure site.");
  if (/document\.write\s*\(/i.test(html)) w.push("document.write is not supported here: the code runs after the page has loaded, so it would be ignored.");
  return w;
}
