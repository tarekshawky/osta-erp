// What the Control Center home says. Pure and unit-tested: the counts come from the page, from real site data.
export type AttentionCounts = {
  newLeads: number;
  // Google Analytics and Tag Manager both filled in: the website then loads Tag Manager only.
  ga4AndGtm: boolean;
  brokenLinks: number;
  pagesWithoutTitle: number;
  pagesWithoutDescription: number;
  imagesWithoutAlt: number;
};

export type AttentionKind = "leads" | "tracking" | "links" | "title" | "description" | "alt";
export type AttentionItem = { kind: AttentionKind; title: string; detail: string; href: string; action: string };

const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

// Most urgent first: people waiting, then things that are broken, then search text that is missing.
export function attentionItems(c: AttentionCounts): AttentionItem[] {
  const items: (AttentionItem | false)[] = [
    c.newLeads > 0 && { kind: "leads", title: many(c.newLeads, "new form submission", "new form submissions"), detail: "Nobody has marked them as contacted", href: "/admin/website/forms", action: "Open" },
    c.ga4AndGtm && { kind: "tracking", title: "GA4 and Tag Manager are both set", detail: "The direct GA4 tag does not load: add GA4 inside Tag Manager", href: "/admin/website/integrations", action: "Check" },
    c.brokenLinks > 0 && { kind: "links", title: many(c.brokenLinks, "broken internal link", "broken internal links"), detail: "They point to pages that do not exist", href: "/admin/website/seo", action: "Fix" },
    c.pagesWithoutTitle > 0 && { kind: "title", title: many(c.pagesWithoutTitle, "page has no SEO title", "pages have no SEO title"), detail: "The page name is used instead (English)", href: "/admin/website/seo", action: "Fix" },
    c.pagesWithoutDescription > 0 && { kind: "description", title: many(c.pagesWithoutDescription, "page has no meta description", "pages have no meta description"), detail: "Search engines pick their own text (English)", href: "/admin/website/seo", action: "Fix" },
    c.imagesWithoutAlt > 0 && { kind: "alt", title: many(c.imagesWithoutAlt, "image has no full alt text", "images have no full alt text"), detail: "In the media library, English or Arabic is empty", href: "/admin/website/media", action: "Fix" },
  ];
  return items.filter((i): i is AttentionItem => !!i);
}

export function attentionSummary(n: number): string {
  return n === 0 ? "Nothing needs you right now." : n === 1 ? "1 thing needs you today." : `${n} things need you today.`;
}

// Whole percent, rounded down so 100% only ever means all of them; nothing to count gives null.
export function percent(part: number, total: number): number | null {
  return total > 0 ? Math.floor((part / total) * 100) : null;
}

// The business works in the UAE, so the greeting and "Today" follow UAE time, wherever the server runs.
export const SITE_TIME_ZONE = "Asia/Dubai";

export function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: SITE_TIME_ZONE }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function dayLabel(date: Date, now: Date): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIME_ZONE }).format(d);
  return day(date) === day(now) ? "Today" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: SITE_TIME_ZONE }).format(date);
}
