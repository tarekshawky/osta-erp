// Plain-text files served by the public site: robots.txt, llms.txt, ads.txt and security.txt. Pure functions, shared
// (copied) with the public site, so what the admin previews is exactly what is served.

export const TECHNICAL_KEYS = ["ai-crawlers", "robots", "llms", "ads", "security"] as const;
export type TechnicalKey = (typeof TECHNICAL_KEYS)[number];
export const MAX_FILE_CHARS = 100_000;

export type AiPolicy = "allow" | "block-training" | "block-all";
export const AI_POLICIES: { value: AiPolicy; label: string; hint: string }[] = [
  { value: "allow", label: "Allow AI crawlers", hint: "AI assistants and search can read and quote the site. Best for being found in AI answers." },
  { value: "block-training", label: "Block AI training only", hint: "Stops crawlers that collect content to train models, but still lets AI assistants and AI search fetch pages to answer questions." },
  { value: "block-all", label: "Block all AI crawlers", hint: "No AI crawler may read the site. The site will not be quoted in AI answers." },
];

// Crawlers that collect content to train models, and crawlers that fetch pages to answer a user or power AI search.
export const AI_TRAINING_BOTS = ["GPTBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "CCBot", "Bytespider", "Applebot-Extended", "cohere-ai", "Meta-ExternalAgent"];
export const AI_ASSISTANT_BOTS = ["ChatGPT-User", "OAI-SearchBot", "PerplexityBot", "Claude-Web", "Claude-SearchBot", "Amazonbot"];

export const isAiPolicy = (v: unknown): v is AiPolicy => v === "allow" || v === "block-training" || v === "block-all";

// Private areas of the customer portal stay out of search engines whatever else is configured.
export const PRIVATE_PATHS = ["/dashboard", "/orders", "/invoices", "/profile", "/more", "/preview"];

export function buildRobotsTxt(o: { allowIndexing: boolean; aiPolicy: AiPolicy; extra: string; sitemapUrl: string }): string {
  const out: string[] = [];
  if (!o.allowIndexing) {
    // The admin switch for a site that is being rebuilt: every crawler stays out.
    out.push("User-agent: *", "Disallow: /");
    return out.join("\n") + "\n";
  }
  out.push("User-agent: *", "Allow: /", ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`), "");
  const blocked = o.aiPolicy === "block-all" ? [...AI_TRAINING_BOTS, ...AI_ASSISTANT_BOTS] : o.aiPolicy === "block-training" ? AI_TRAINING_BOTS : [];
  for (const bot of blocked) out.push(`User-agent: ${bot}`, "Disallow: /", "");
  const extra = o.extra.trim();
  if (extra) out.push("# Added in the admin", extra, "");
  out.push(`Sitemap: ${o.sitemapUrl}`);
  return out.join("\n") + "\n";
}

// robots.txt additions: only crawler directives and comments, so a typo can't break the file for search engines.
const ROBOTS_LINE = /^(user-agent|allow|disallow|crawl-delay|sitemap|host)\s*:\s*\S.*$/i;
export function robotsProblem(text: string): string | null {
  if (text.length > MAX_FILE_CHARS) return "robots.txt additions are too long.";
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (!ROBOTS_LINE.test(line)) return `Line ${i + 1} isn't a robots.txt rule ("${line.slice(0, 40)}"). Use User-agent, Allow, Disallow, Crawl-delay or Sitemap lines, or start the line with #.`;
  }
  return null;
}

// ads.txt: "domain, publisher id, DIRECT|RESELLER[, certification id]" or a variable like CONTACT=…
const ADS_LINE = /^([^,\s#]+\s*,\s*[^,\s#]+\s*,\s*(DIRECT|RESELLER)(\s*,\s*[^,\s#]+)?|[A-Za-z]+\s*=\s*\S.*)\s*(#.*)?$/i;
export function adsProblem(text: string): string | null {
  if (text.length > MAX_FILE_CHARS) return "ads.txt is too long.";
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (!ADS_LINE.test(line)) return `Line ${i + 1} isn't a valid ads.txt entry ("${line.slice(0, 40)}"). Use: domain, publisher-id, DIRECT or RESELLER.`;
  }
  return null;
}

// security.txt (RFC 9116) needs at least one Contact; the rest is free text.
export function securityProblem(text: string): string | null {
  if (text.length > MAX_FILE_CHARS) return "security.txt is too long.";
  if (!/^contact\s*:\s*(mailto:|https:\/\/|tel:)\S+/im.test(text)) return "security.txt needs a Contact line such as  Contact: mailto:security@example.com  (or an https:// address).";
  return null;
}

export function technicalProblem(key: TechnicalKey, content: string): string | null {
  if (key === "robots") return robotsProblem(content);
  if (key === "ads") return adsProblem(content);
  if (key === "security") return securityProblem(content);
  if (content.length > MAX_FILE_CHARS) return "This file is too long.";
  return null;
}

// A starting point for llms.txt (a short guide for AI assistants), built from what the site already knows.
export function generateLlmsTxt(o: {
  siteName: string; description: string; origin: string; phone: string; email: string; address: string;
  services: { name: string; path: string; summary: string }[]; pages: { name: string; path: string }[]; areas: string[];
}): string {
  const link = (name: string, path: string, note = "") => `- [${name}](${o.origin}${path})${note ? `: ${note}` : ""}`;
  const lines = [`# ${o.siteName}`, "", `> ${o.description || `${o.siteName} provides home maintenance services in the UAE.`}`, ""];
  if (o.areas.length) lines.push(`Areas served: ${o.areas.join(", ")}.`, "");
  const contact = [o.phone && `Phone: ${o.phone}`, o.email && `Email: ${o.email}`, o.address && `Address: ${o.address}`].filter(Boolean);
  if (contact.length) lines.push("## Contact", "", ...contact.map((c) => `- ${c}`), "");
  if (o.services.length) lines.push("## Services", "", ...o.services.map((s) => link(s.name, s.path, s.summary)), "");
  lines.push("## Key pages", "", link("Pricing and booking", "/pricing", "live prices by emirate and service"), link("Blog", "/blog", "guides and advice"), ...o.pages.map((p) => link(p.name, p.path)), "");
  return lines.join("\n");
}
