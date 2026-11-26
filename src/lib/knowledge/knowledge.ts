// The AI Knowledge Center: the facts about the business that customers, search engines and AI assistants may rely on.
// Pure and unit-tested. The one rule that matters: nothing typed here is public until it is complete in both languages, names
// its source page and a person has checked that exact text.

export const ENTRY_TYPES = ["FACT", "FAQ", "SERVICE", "AREA", "POLICY", "GUIDE", "COMPARISON", "PROFILE"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export const TYPE_LABEL: Record<EntryType, string> = { FACT: "Fact", FAQ: "FAQ", SERVICE: "Service", AREA: "Area", POLICY: "Policy", GUIDE: "Guide", COMPARISON: "Comparison", PROFILE: "Profile" };
export const isEntryType = (v: unknown): v is EntryType => (ENTRY_TYPES as readonly unknown[]).includes(v);

// Sections whose lines are read from another screen, so they are typed once and update everywhere.
export const AUTO_SOURCES = {
  contact: { label: "Contact from Site & contact", href: "/admin/website/site" },
  packages: { label: "Prices from Maintenance packages", href: "/admin/website/maintenance-packages" },
  areas: { label: "Areas from Service areas", href: "/admin/website/areas" },
  profiles: { label: "Profiles from Social links", href: "/admin/website/social" },
} as const;
export type AutoSource = keyof typeof AUTO_SOURCES;
export const isAutoSource = (v: string): v is AutoSource => Object.prototype.hasOwnProperty.call(AUTO_SOURCES, v);

export const VERIFY_DAYS = 90;
export const LIMITS = { title: 200, body: 4000, source: 500, note: 600, section: 80 };

export type EntryText = { titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; sourceUrl: string };
export type EntryInput = EntryText & { type: string; sectionId: string; visible: boolean; schemaOn: boolean; note: string };

// Text still waiting for a fact from the owner is written in [square brackets].
export function placeholders(text: string): string[] {
  return text.match(/\[[^\]\n]*\]/g) ?? [];
}

export const isSourceLink = (v: string) => /^(https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(v.trim());

// Everything that stops an entry from being checked and published, in words the owner can act on.
export function entryProblems(e: EntryText): string[] {
  const out: string[] = [];
  const empty = ([["English title", e.titleEn], ["Arabic title", e.titleAr], ["English text", e.bodyEn], ["Arabic text", e.bodyAr]] as const).filter(([, v]) => !v.trim()).map(([name]) => name);
  if (empty.length) out.push(`Missing: ${empty.join(", ")}.`);
  const open = [...new Set([e.titleEn, e.titleAr, e.bodyEn, e.bodyAr].flatMap(placeholders))];
  if (open.length) out.push(`Still to fill in: ${open.join(" ")}`);
  if (!e.sourceUrl.trim()) out.push("Add the source page.");
  else if (!isSourceLink(e.sourceUrl)) out.push("The source page must be an https:// address or a path that starts with /.");
  return out;
}

// What stops an entry from being saved at all. A draft may be unfinished.
export function saveProblem(e: EntryInput): string | null {
  if (!isEntryType(e.type)) return "Choose the kind of entry.";
  if (!e.titleEn.trim()) return "Write the English title (or question).";
  if (e.titleEn.length > LIMITS.title || e.titleAr.length > LIMITS.title) return `A title can be up to ${LIMITS.title} characters.`;
  if (e.bodyEn.length > LIMITS.body || e.bodyAr.length > LIMITS.body) return `The text can be up to ${LIMITS.body} characters.`;
  if (e.sourceUrl.length > LIMITS.source) return "The source page address is too long.";
  if (e.sourceUrl.trim() && !isSourceLink(e.sourceUrl)) return "The source page must be an https:// address or a path that starts with /.";
  if (e.note.length > LIMITS.note) return `The private note can be up to ${LIMITS.note} characters.`;
  return null;
}

// A check belongs to the exact text it was made on: changing any of these asks for a new check.
export function textChanged(before: EntryText, after: EntryText): boolean {
  return (["titleEn", "titleAr", "bodyEn", "bodyAr", "sourceUrl"] as const).some((k) => before[k].trim() !== after[k].trim());
}

export type EntryState = "incomplete" | "unchecked" | "old" | "checked";
export const STATE_LABEL: Record<EntryState, string> = { incomplete: "Needs text", unchecked: "Not checked", old: "Check again", checked: "Checked" };

export function entryState(e: EntryText & { verifiedAt: Date | string | null }, now: Date): EntryState {
  if (entryProblems(e).length) return "incomplete";
  if (!e.verifiedAt) return "unchecked";
  return now.getTime() - new Date(e.verifiedAt).getTime() > VERIFY_DAYS * 86_400_000 ? "old" : "checked";
}

// An old check keeps the entry public (and is reported); it is never public without a check at all.
export function isPublicEntry(e: EntryText & { verifiedAt: Date | string | null; visible: boolean }, sectionVisible: boolean): boolean {
  return sectionVisible && e.visible && !!e.verifiedAt && entryProblems(e).length === 0;
}

// ---- lines read from other screens -------------------------------------------------------------------------------------

export type AutoLine = { id: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; sourceUrl: string };

export type SyncData = {
  settings: { phone: string; whatsapp: string; email: string; addressEn: string; addressAr: string; hoursEn: string; hoursAr: string } | null;
  packages: { nameEn: string; nameAr: string; price: number | null; priceTextEn: string; priceTextAr: string; pricePrefixEn: string; pricePrefixAr: string; maxAcUnits: number | null; services: number; suitableEn: string; suitableAr: string }[];
  areas: { nameEn: string; nameAr: string }[];
  profiles: { platform: string; label: string; url: string }[];
};

const line = (id: string, titleEn: string, titleAr: string, bodyEn: string, bodyAr: string, sourceUrl = ""): AutoLine => ({ id, titleEn, titleAr, bodyEn, bodyAr, sourceUrl });
const PLATFORM: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube", x: "X", whatsapp: "WhatsApp" };

export function autoLines(source: string, data: SyncData): AutoLine[] {
  if (source === "contact") {
    const s = data.settings;
    if (!s) return [];
    const rows: [string, string, string, string, string][] = [
      ["phone", "Phone", "الهاتف", s.phone, s.phone],
      ["whatsapp", "WhatsApp", "واتساب", s.whatsapp ? `+${s.whatsapp}` : "", s.whatsapp ? `+${s.whatsapp}` : ""],
      ["email", "Email", "البريد الإلكتروني", s.email, s.email],
      ["address", "Offices", "المكاتب", s.addressEn, s.addressAr],
      ["hours", "Working hours", "مواعيد العمل", s.hoursEn, s.hoursAr],
    ];
    return rows.filter(([, , , en]) => en.trim()).map(([id, te, ta, en, ar]) => line(`contact-${id}`, te, ta, en.trim(), ar.trim()));
  }
  if (source === "packages") {
    // Built from the price and limits only: the free-text description is not repeated, so it can never contradict them.
    return data.packages.map((p, i) => {
      const priceEn = p.price !== null ? `${p.pricePrefixEn ? `${p.pricePrefixEn} ` : ""}AED ${p.price.toLocaleString("en-US")} per year` : p.priceTextEn;
      const priceAr = p.price !== null ? `${p.pricePrefixAr ? `${p.pricePrefixAr} ` : ""}${p.price.toLocaleString("en-US")} درهم في السنة` : p.priceTextAr;
      const en = [priceEn, p.maxAcUnits ? `Maximum AC units: ${p.maxAcUnits}` : "", p.services ? `Services included: ${p.services}` : ""].filter(Boolean).join(". ");
      const ar = [priceAr, p.maxAcUnits ? `أقصى عدد للمكيفات: ${p.maxAcUnits}` : "", p.services ? `عدد الخدمات المشمولة: ${p.services}` : ""].filter(Boolean).join(". ");
      return line(`package-${i}`, p.nameEn, p.nameAr, en && `${en}.`, ar && `${ar}.`);
    });
  }
  if (source === "areas") return data.areas.map((a, i) => line(`area-${i}`, a.nameEn, a.nameAr, `Osta Services covers ${a.nameEn}.`, `خدمات آسطا تغطي ${a.nameAr}.`));
  if (source === "profiles") {
    return data.profiles.map((p, i) => {
      const name = PLATFORM[p.platform] ?? (p.label || "Profile");
      return line(`profile-${i}`, name, name, p.url, p.url, p.url);
    });
  }
  return [];
}

// ---- AI readiness -----------------------------------------------------------------------------------------------------

// "up to 5 AC units" / "حتى 6 مكيفات" in a package's description, when it names a number of units.
function unitsInText(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  return m ? Number(m[1]) : null;
}

export function packageMismatches(packages: SyncData["packages"]): string[] {
  const out: string[] = [];
  for (const p of packages) {
    if (!p.maxAcUnits) continue;
    for (const [lang, said] of [["English", unitsInText(p.suitableEn, /(\d+)\s*AC\s*units?/i)], ["Arabic", unitsInText(p.suitableAr, /(\d+)\s*مكيف/)]] as const) {
      if (said !== null && said !== p.maxAcUnits) out.push(`${p.nameEn}: the ${lang} description says ${said} AC units, the package limit is ${p.maxAcUnits}.`);
    }
  }
  return out;
}

export type BranchFacts = { name: string; phone: string; locality: string };

const plain = (v: string) => v.toLowerCase().replace(/\bst\b\.?/g, "street").replace(/[^a-z0-9]+/g, " ").trim();
const digits = (v: string) => v.replace(/\D/g, "");

// The same phone and address everywhere: each location is compared with the Site & contact screen.
export function contactMismatches(settings: SyncData["settings"], branches: BranchFacts[]): string[] {
  if (!settings) return ["The Site & contact screen is not filled in."];
  const out: string[] = [];
  const address = ` ${plain(settings.addressEn)} `;
  for (const b of branches) {
    if (b.phone && settings.phone && digits(b.phone) !== digits(settings.phone)) out.push(`${b.name}: its phone ${b.phone} differs from the main number ${settings.phone}.`);
    const district = plain(b.locality.split(",")[0] ?? "");
    if (district && !address.includes(` ${district} `)) out.push(`${b.name}: “${b.locality.split(",")[0].trim()}” is not in the address on Site & contact.`);
  }
  return out;
}

export type Check = { id: string; label: string; ok: boolean; details: string[]; action?: { label: string; href: string } };

export function readiness(input: {
  entries: (EntryText & { verifiedAt: Date | string | null; visible: boolean; sectionVisible: boolean })[];
  llmsPublished: boolean;
  settings: SyncData["settings"];
  packages: SyncData["packages"];
  branches: BranchFacts[];
  now: Date;
}): Check[] {
  const shown = input.entries.filter((e) => e.visible && e.sectionVisible);
  const states = shown.map((e) => entryState(e, input.now));
  const count = (s: EntryState) => states.filter((x) => x === s).length;
  const say = (n: number, text: string) => (n ? [`${n} ${n === 1 ? "entry" : "entries"} ${text}`] : []);
  const contact = contactMismatches(input.settings, input.branches);
  const packages = packageMismatches(input.packages);
  return [
    { id: "complete", label: "Every shown entry is complete in both languages", ok: shown.length > 0 && count("incomplete") === 0, details: shown.length ? say(count("incomplete"), "still need text or a source") : ["There are no entries yet."] },
    { id: "checked", label: `Every shown entry checked in the last ${VERIFY_DAYS} days`, ok: shown.length > 0 && count("checked") === shown.length, details: [...say(count("unchecked"), "never checked"), ...say(count("old"), "checked too long ago")] },
    { id: "contact", label: "Phone and addresses are the same everywhere", ok: contact.length === 0, details: contact, action: { label: "Review", href: "/admin/website/locations" } },
    { id: "packages", label: "Package descriptions match their limits", ok: packages.length === 0, details: packages, action: { label: "Fix", href: "/admin/website/maintenance-packages" } },
    { id: "llms", label: "llms.txt is published", ok: input.llmsPublished, details: input.llmsPublished ? [] : ["Switched off or empty on Technical files."], action: { label: "Open", href: "/admin/website/technical" } },
  ];
}

// ---- llms.txt ---------------------------------------------------------------------------------------------------------

const oneLine = (v: string) => v.replace(/\s+/g, " ").trim();
const linkText = (v: string) => oneLine(v).replace(/[[\]]/g, "");

export type LlmsSection = { title: string; lines: { titleEn: string; bodyEn: string; sourceUrl: string }[] };

// The English llms.txt made only from what is public. Brackets, hidden entries and unchecked text never reach it.
export function buildLlmsTxt(input: { siteName: string; summary: string; origin: string; sections: LlmsSection[] }): string {
  const out = [`# ${oneLine(input.siteName)}`];
  if (input.summary.trim()) out.push("", `> ${oneLine(input.summary)}`);
  for (const s of input.sections) {
    if (!s.lines.length) continue;
    out.push("", `## ${oneLine(s.title)}`);
    for (const l of s.lines) {
      const url = l.sourceUrl.startsWith("/") ? `${input.origin}${l.sourceUrl}` : l.sourceUrl;
      const head = url ? `[${linkText(l.titleEn)}](${url.replace(/\)/g, "%29")})` : oneLine(l.titleEn);
      out.push(`- ${head}: ${oneLine(l.bodyEn)}`);
    }
  }
  return out.join("\n") + "\n";
}
