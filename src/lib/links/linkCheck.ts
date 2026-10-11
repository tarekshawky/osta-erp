import { lookup } from "dns/promises";
import { isIP } from "net";

// ---------- SSRF protection ----------
// The "check this link" tools make the SERVER fetch addresses an admin typed. That must never reach internal
// systems (cloud metadata, localhost, private networks), so every address is validated before connecting.
export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7)); // IPv4-mapped IPv6
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(v) === 6) return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || /^fe[89ab]/.test(v) || v.startsWith("ff");
  return true; // not a valid IP at all
}

// URL.hostname keeps the brackets around IPv6 literals ("[::1]"); strip them so the IP checks recognise them.
const hostOf = (u: URL) => u.hostname.toLowerCase().replace(/^\[|\]$/g, "");

export function urlProblem(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "That is not a valid web address.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "Only http:// and https:// addresses can be checked.";
  if (u.username || u.password) return "Addresses with a username or password aren't allowed.";
  if (u.port && !["80", "443"].includes(u.port)) return "Only the standard web ports can be checked.";
  const host = hostOf(u);
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return "That address isn't a public website.";
  if (isIP(host) && isPrivateAddress(host)) return "That address isn't a public website.";
  return null;
}

async function assertPublicHost(raw: string) {
  const problem = urlProblem(raw);
  if (problem) throw new Error(problem);
  const host = hostOf(new URL(raw));
  if (isIP(host)) return;
  const addrs = await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("That address isn't a public website.");
}

export type Fetched = { status: number; finalUrl: string; html: string | null };

// GET with: public-address check on every hop, max 3 redirects, 8s timeout, and a 500 KB body cap.
// Residual risk: a DNS record that changes between our check and the connection (rebinding). Mitigated by the admin-only
// access and by never returning page content to the caller (only a status and the matching link).
export async function safeFetch(raw: string, opts: { wantBody: boolean }): Promise<Fetched> {
  let url = raw;
  for (let hop = 0; hop <= 3; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      method: opts.wantBody ? "GET" : "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "OSTA-LinkChecker/1.0 (+site owner link check)", Accept: "text/html,*/*;q=0.5" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    if (!opts.wantBody || !res.ok) return { status: res.status, finalUrl: url, html: null };

    const reader = res.body?.getReader();
    let html = "";
    let size = 0;
    const decoder = new TextDecoder();
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (size > 500_000) {
        await reader.cancel();
        break;
      }
    }
    return { status: res.status, finalUrl: url, html };
  }
  throw new Error("Too many redirects.");
}

// ---------- reading links out of HTML ----------
export type FoundLink = { href: string; rel: string; text: string };

export function parseLinks(html: string, baseUrl: string): FoundLink[] {
  const out: FoundLink[] = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 2000) {
    const attrs = m[1];
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    if (!href) continue;
    const raw = (href[1] ?? href[2] ?? href[3] ?? "").trim();
    let abs: string;
    try {
      abs = new URL(raw.replace(/&amp;/g, "&"), baseUrl).toString();
    } catch {
      continue;
    }
    const rel = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    out.push({ href: abs, rel: (rel?.[1] ?? rel?.[2] ?? rel?.[3] ?? "").toLowerCase(), text: m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) });
  }
  return out;
}

const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");

// The link on that page that points at our site (optionally a specific path), and what kind of link it is.
export function findLinkToSite(links: FoundLink[], siteHost: string, targetPath?: string): { link: FoundLink; linkType: "dofollow" | "nofollow" | "sponsored" | "ugc" } | null {
  const want = targetPath ? targetPath.replace(/\/+$/, "") || "/" : null;
  for (const link of links) {
    let u: URL;
    try {
      u = new URL(link.href);
    } catch {
      continue;
    }
    if (bare(u.hostname) !== bare(siteHost)) continue;
    if (want && (u.pathname.replace(/\/+$/, "") || "/") !== want) continue;
    const tokens = link.rel.split(/\s+/);
    const linkType = tokens.includes("sponsored") ? "sponsored" : tokens.includes("ugc") ? "ugc" : tokens.includes("nofollow") ? "nofollow" : "dofollow";
    return { link, linkType };
  }
  return null;
}

// Our page being linked to: a site path, or a full URL on our own domain (normalised to a path).
export function normalizeTarget(raw: string, siteHost: string): string | null {
  const v = raw.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v.slice(0, 300);
  try {
    const u = new URL(v);
    if (bare(u.hostname) === bare(siteHost)) return (u.pathname + u.search).slice(0, 300) || "/";
  } catch {}
  return null;
}
