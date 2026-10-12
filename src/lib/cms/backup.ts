import { parseBlocks, type Block } from "./blocks";
import { slugProblem } from "./pageRules";
import { redirectProblem } from "./pageRules";
import { menuProblem, settingsProblem, socialProblem, type MenuItemInput, type SettingsInput } from "@/lib/site/siteRules";
import { formProblem, type FormField } from "@/lib/forms/forms";

// Content backup format. Contains website CONTENT only: never leads, customers, orders, passwords, or uploaded image
// files (images are referenced by URL). Pages are exported as their working draft and always import as drafts, so an
// import can never publish anything by itself.
export const BACKUP_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 300;

export type BackupPage = {
  slug: string; type: string; titleEn: string; titleAr: string; showInMenus: boolean; showInSitemap: boolean; showLastUpdated: boolean;
  isHomepage: boolean; blocks: Block[]; seo: Record<string, unknown>;
};
export type BackupSocial = { platform: string; label: string; url: string; visible: boolean };
export type BackupForm = {
  slug: string; nameEn: string; nameAr: string; fields: FormField[]; recipients: string[];
  submitLabelEn: string; submitLabelAr: string; successEn: string; successAr: string; active: boolean;
};
export type BackupArea = {
  slug: string; regionSlug: string; nameEn: string; nameAr: string; kind: string; latitude: number | null; longitude: number | null;
  mapsUrl: string; active: boolean; serviceSlugs: string[];
};
export type Bundle = {
  version: number;
  exportedAt: string;
  pages: BackupPage[];
  site: SettingsInput | null;
  menus: { header: MenuItemInput[]; footer: MenuItemInput[] };
  social: BackupSocial[];
  forms: BackupForm[];
  areas: BackupArea[];
  redirects: { from: string; to: string }[];
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export type ValidationResult =
  | { ok: true; bundle: Bundle; summary: Record<string, number> }
  | { ok: false; errors: string[] };

// Validates an uploaded bundle with the SAME rules the admin screens use. Nothing here touches the database.
export function validateBundle(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["This is not a content backup file."] };
  if (input.version !== BACKUP_VERSION) return { ok: false, errors: [`Unsupported backup version (this site reads version ${BACKUP_VERSION}).`] };

  const pagesIn = arr(input.pages);
  if (pagesIn.length > MAX_PAGES) return { ok: false, errors: [`A backup can hold at most ${MAX_PAGES} pages.`] };

  const pages: BackupPage[] = [];
  const seen = new Set<string>();
  let homepages = 0;
  for (const raw of pagesIn) {
    if (!isObj(raw)) {
      errors.push("A page entry is malformed.");
      continue;
    }
    const slug = str(raw.slug);
    const isHomepage = raw.isHomepage === true;
    const label = isHomepage ? "Homepage" : `Page “${slug || "(no slug)"}”`;
    if (isHomepage) {
      homepages++;
      if (slug !== "home") errors.push(`${label}: the homepage's internal slug must be "home".`);
    } else {
      const sp = slugProblem(slug, true);
      if (sp) errors.push(`${label}: ${sp}`);
    }
    if (seen.has(slug)) errors.push(`${label}: appears twice.`);
    seen.add(slug);
    if (!str(raw.titleEn).trim() || !str(raw.titleAr).trim()) errors.push(`${label}: both titles are required.`);
    if (!["page", "service", "area", "article", "landing"].includes(str(raw.type))) errors.push(`${label}: unknown page type.`);
    const blocks = parseBlocks(raw.blocks);
    if (!blocks.ok) errors.push(`${label}: ${blocks.error}`);
    pages.push({
      slug, type: isHomepage ? "page" : str(raw.type), titleEn: str(raw.titleEn), titleAr: str(raw.titleAr), showInMenus: raw.showInMenus !== false,
      showInSitemap: raw.showInSitemap !== false, showLastUpdated: raw.showLastUpdated === true, isHomepage,
      blocks: blocks.ok ? blocks.blocks : [], seo: isObj(raw.seo) ? raw.seo : {},
    });
  }
  if (homepages > 1) errors.push("Only one page can be the homepage.");

  let site: SettingsInput | null = null;
  if (input.site !== null && input.site !== undefined) {
    if (!isObj(input.site)) errors.push("Site settings are malformed.");
    else {
      site = input.site as unknown as SettingsInput;
      if (!Array.isArray(site.footerAreas)) errors.push("Site settings: footer areas are missing.");
      else {
        const p = settingsProblem(site);
        if (p) errors.push(`Site settings: ${p}`);
      }
    }
  }

  const menus = isObj(input.menus) ? input.menus : {};
  const header = arr(menus.header) as MenuItemInput[];
  const footer = arr(menus.footer) as MenuItemInput[];
  for (const [name, items] of [["Header menu", header], ["Footer menu", footer]] as const) {
    const p = items.length ? menuProblem(items) : null;
    if (p) errors.push(`${name}: ${p}`);
  }

  const social = arr(input.social).filter(isObj).map((s) => ({ platform: str(s.platform), label: str(s.label), url: str(s.url), visible: s.visible !== false }));
  for (const s of social) {
    const p = socialProblem(s);
    if (p) errors.push(`Social link “${s.url || s.platform}”: ${p}`);
  }

  const forms: BackupForm[] = arr(input.forms).filter(isObj).map((f) => ({
    slug: str(f.slug), nameEn: str(f.nameEn), nameAr: str(f.nameAr), fields: arr(f.fields) as FormField[], recipients: arr(f.recipients).map(str),
    submitLabelEn: str(f.submitLabelEn) || "Send", submitLabelAr: str(f.submitLabelAr) || "إرسال",
    successEn: str(f.successEn) || "Thank you!", successAr: str(f.successAr) || "شكراً لك!", active: f.active !== false,
  }));
  for (const f of forms) {
    const p = formProblem(f);
    if (p) errors.push(`Form “${f.slug}”: ${p}`);
  }

  const areas: BackupArea[] = arr(input.areas).filter(isObj).map((a) => ({
    slug: str(a.slug), regionSlug: str(a.regionSlug), nameEn: str(a.nameEn), nameAr: str(a.nameAr), kind: str(a.kind) || "area",
    latitude: typeof a.latitude === "number" ? a.latitude : null, longitude: typeof a.longitude === "number" ? a.longitude : null,
    mapsUrl: str(a.mapsUrl), active: a.active !== false, serviceSlugs: arr(a.serviceSlugs).map(str),
  }));
  for (const a of areas) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) || !a.nameEn.trim() || !a.nameAr.trim()) errors.push(`Area “${a.slug}”: slug and both names are required.`);
    if (a.mapsUrl && !/^https:\/\//.test(a.mapsUrl)) errors.push(`Area “${a.slug}”: the map link must start with https://`);
  }

  const redirects = arr(input.redirects).filter(isObj).map((r) => ({ from: str(r.from), to: str(r.to) }));
  for (const r of redirects) {
    const p = redirectProblem(r.from, r.to);
    if (p) errors.push(`Redirect ${r.from}: ${p}`);
  }

  if (errors.length) return { ok: false, errors: errors.slice(0, 40) };
  return {
    ok: true,
    bundle: { version: BACKUP_VERSION, exportedAt: str(input.exportedAt), pages, site, menus: { header, footer }, social, forms, areas, redirects },
    summary: { pages: pages.length, menuItems: header.length + footer.length, socialLinks: social.length, forms: forms.length, areas: areas.length, redirects: redirects.length, siteSettings: site ? 1 : 0 },
  };
}
