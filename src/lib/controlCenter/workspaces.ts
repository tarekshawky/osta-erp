import { leafAllowed, searchNav, type NavGroup } from "@/lib/adminNav";

// The OSTA Control Center: the website admin grouped into workspaces, shown as one dock at the top. It replaces the sidebar and the
// long tab bar there. Every workspace lists only pages that exist; ones the design shows but that are not built yet are not listed.
export type WorkspaceId = "dashboard" | "builder" | "content" | "services" | "locations" | "seo" | "leads" | "media" | "connect" | "dev" | "system";
export type WorkspaceTab = { href: string; label: string; keywords?: string };
export type Workspace = { id: WorkspaceId; label: string; title: string; hint: string; tabs: WorkspaceTab[] };

export const WORKSPACES: Workspace[] = [
  { id: "dashboard", label: "Dashboard", title: "Dashboard", hint: "What needs you today", tabs: [{ href: "/admin/website", label: "Home", keywords: "overview dashboard الرئيسية" }] },
  { id: "builder", label: "Builder", title: "Builder", hint: "Pages and layout", tabs: [
    { href: "/admin/website/pages", label: "Pages", keywords: "page builder blocks صفحات" },
    { href: "/admin/website/structure", label: "Page structure", keywords: "tree hierarchy parent" },
    { href: "/admin/website/global-blocks", label: "Global blocks", keywords: "reusable shared" },
    { href: "/admin/website/menus", label: "Menus", keywords: "navigation header footer قوايم منيو" },
    { href: "/admin/home-sections", label: "Homepage sections", keywords: "home" },
  ] },
  { id: "content", label: "Content", title: "Content", hint: "Articles and policies", tabs: [
    { href: "/admin/blog", label: "Blog", keywords: "articles posts مدونة" },
    { href: "/admin/blog/categories", label: "Blog categories", keywords: "topics" },
    { href: "/admin/legal", label: "Legal Center", keywords: "policies terms privacy سياسات شروط" },
    { href: "/admin/website/knowledge", label: "AI Knowledge Center", keywords: "knowledge facts faq llms assistants معرفة أسئلة" },
  ] },
  { id: "services", label: "Services", title: "Services", hint: "What you sell", tabs: [
    { href: "/admin/services", label: "Website services", keywords: "service pages خدمات" },
    { href: "/admin/catalog", label: "Service catalogue", keywords: "categories import export" },
    { href: "/admin/website/maintenance-packages", label: "Maintenance packages", keywords: "amc annual plans" },
  ] },
  { id: "locations", label: "Locations", title: "Locations", hint: "Where you work", tabs: [
    { href: "/admin/website/areas", label: "Service areas", keywords: "local seo emirates مناطق" },
    { href: "/admin/website/locations", label: "Locations", keywords: "branches map" },
  ] },
  { id: "seo", label: "SEO", title: "SEO Center", hint: "Search visibility", tabs: [
    { href: "/admin/website/seo", label: "Audit", keywords: "score titles descriptions" },
    { href: "/admin/website/redirects", label: "Redirects & sitemap", keywords: "301 sitemap تحويل" },
    { href: "/admin/website/technical", label: "Technical files & AI", keywords: "robots.txt llms.txt ads.txt crawlers" },
    { href: "/admin/website/links", label: "Page links", keywords: "internal broken" },
    { href: "/admin/website/backlinks", label: "Backlinks", keywords: "disavow referring domains" },
  ] },
  { id: "leads", label: "Leads", title: "Leads", hint: "Forms and enquiries", tabs: [{ href: "/admin/website/forms", label: "Forms & leads", keywords: "submissions enquiries export عملاء" }] },
  { id: "media", label: "Media", title: "Media", hint: "Images", tabs: [{ href: "/admin/website/media", label: "Library", keywords: "images upload alt text صور" }] },
  { id: "connect", label: "Connect", title: "Connect", hint: "Outside services", tabs: [
    { href: "/admin/website/integrations", label: "Integrations", keywords: "google analytics tag manager meta pixel search console consent" },
    { href: "/admin/website/social", label: "Social links", keywords: "facebook instagram tiktok whatsapp" },
  ] },
  { id: "dev", label: "Dev", title: "Developer", hint: "Custom code", tabs: [
    { href: "/admin/website/code", label: "Header & footer code", keywords: "scripts pixel head body" },
    { href: "/admin/website/page-code", label: "Page code", keywords: "scripts per page" },
  ] },
  { id: "system", label: "System", title: "System", hint: "Site settings and backup", tabs: [
    { href: "/admin/website/site", label: "Site & contact", keywords: "name logo phone email address settings" },
    { href: "/admin/website/backup", label: "Backup", keywords: "export restore نسخة احتياطية" },
  ] },
];

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
// The Home tab is only itself: every other website page also starts with "/admin/website/".
const onTab = (pathname: string, href: string) => (href === "/admin/website" ? pathname === href : under(pathname, href));

// The screens that use the Control Center layout instead of the ERP sidebar.
export function isControlCenterPath(pathname: string): boolean {
  return WORKSPACES.some((w) => w.tabs.some((t) => under(pathname, t.href)));
}

// Only the pages this admin may open; a workspace with none disappears. Pages are protected on the server as well.
export function visibleWorkspaces(adminSections: string[], isSuperAdmin: boolean): Workspace[] {
  return WORKSPACES.map((w) => ({ ...w, tabs: w.tabs.filter((t) => leafAllowed(t.href, adminSections, isSuperAdmin)) })).filter((w) => w.tabs.length > 0);
}

// The workspace and tab of an address; the longest matching tab wins (blog categories over blog).
export function whereAmI(workspaces: Workspace[], pathname: string): { workspace: Workspace; tab: WorkspaceTab } | null {
  let best: { workspace: Workspace; tab: WorkspaceTab } | null = null;
  for (const workspace of workspaces) {
    for (const tab of workspace.tabs) {
      if (onTab(pathname, tab.href) && (!best || tab.href.length > best.tab.href.length)) best = { workspace, tab };
    }
  }
  return best;
}

export type Command = { href: string; title: string; hint: string; workspace: WorkspaceId | null };

// A typed word has to start a word: "ac" finds "AC repair", not "backup".
const startsAWord = (text: string, word: string) => {
  for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + 1)) {
    if (i === 0 || " ›&./()-".includes(text[i - 1])) return true;
  }
  return false;
};

// What the search box offers for a query: website screens first, then the matching website pages, then the rest of the ERP.
// With no query, one line per workspace.
export function searchCommands(workspaces: Workspace[], groups: NavGroup[], query: string, pages: Command[] = [], limit = 6): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return workspaces.map((w) => ({ href: w.tabs[0].href, title: w.title, hint: w.hint, workspace: w.id }));
  const words = q.split(/\s+/);
  const hits: { command: Command; score: number }[] = [];
  for (const w of workspaces) {
    for (const t of w.tabs) {
      const name = `${w.title} ${t.label}`.toLowerCase();
      const text = `${name} ${w.label} ${t.keywords ?? ""}`.toLowerCase();
      if (!words.every((x) => startsAWord(text, x))) continue;
      hits.push({ command: { href: t.href, title: `${w.title} › ${t.label}`, hint: w.hint, workspace: w.id }, score: t.label.toLowerCase().startsWith(q) ? 0 : name.includes(q) ? 1 : 2 });
    }
  }
  const own = hits.sort((a, b) => a.score - b.score).map((h) => h.command);
  const listed = new Set(workspaces.flatMap((w) => w.tabs.map((t) => t.href)));
  const erp = searchNav(groups, query, limit * 3).filter((h) => !listed.has(h.href)).map((h) => ({ href: h.href, title: h.label, hint: h.group, workspace: null }));
  return [...own.slice(0, limit), ...pages, ...erp.slice(0, limit)];
}
