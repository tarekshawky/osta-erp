import { autoLines, isPublicEntry, type AutoSource, type EntryText, type SyncData } from "./knowledge";

// What leaves the admin for the website and /knowledge.json. Pure and unit-tested: every field is picked by name, so a
// private note, an unchecked or hidden entry, or a new database column can never slip out.

export type PublicItem = { id: string; type: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; sourceUrl: string; verifiedAt: string | null; automatic: boolean; schema: boolean };
export type PublicSection = { key: string; titleEn: string; titleAr: string; items: PublicItem[] };
export type PublicKnowledge = { indexable: boolean; llms: boolean; latestCheck: string | null; sections: PublicSection[] };

export type StoredSection = {
  key: string; titleEn: string; titleAr: string; auto: string; visible: boolean;
  entries: (EntryText & { id: string; type: string; verifiedAt: Date | null; visible: boolean; schemaOn: boolean })[];
};

export function publicKnowledge(sections: StoredSection[], sync: SyncData, options: { indexable: boolean; llms: boolean }): PublicKnowledge {
  let latest = 0;
  const out: PublicSection[] = [];
  for (const s of sections) {
    if (!s.visible) continue;
    // A section the owner added gets a random key; its address on the page must stay readable and stable.
    const items: PublicItem[] = autoLines(s.auto as AutoSource, sync).map((l) => ({ id: l.id, type: s.auto === "areas" ? "AREA" : s.auto === "profiles" ? "PROFILE" : "FACT", titleEn: l.titleEn, titleAr: l.titleAr, bodyEn: l.bodyEn, bodyAr: l.bodyAr, sourceUrl: l.sourceUrl, verifiedAt: null, automatic: true, schema: false }));
    for (const e of s.entries) {
      if (!isPublicEntry(e, true) || !e.verifiedAt) continue;
      latest = Math.max(latest, e.verifiedAt.getTime());
      items.push({ id: e.id, type: e.type, titleEn: e.titleEn, titleAr: e.titleAr, bodyEn: e.bodyEn, bodyAr: e.bodyAr, sourceUrl: e.sourceUrl, verifiedAt: e.verifiedAt.toISOString(), automatic: false, schema: e.schemaOn });
    }
    if (items.length) out.push({ key: s.key, titleEn: s.titleEn, titleAr: s.titleAr, items });
  }
  return { indexable: options.indexable, llms: options.llms, latestCheck: latest ? new Date(latest).toISOString() : null, sections: out };
}

// The public page's switch is kept as one row beside the other published files: enabled = the page is on, and the content
// says whether search engines and AI assistants may index it. Off unless the owner switches it on.
export const PAGE_KEY = "knowledge-page";
export type PageSetting = { enabled: boolean; indexable: boolean };
export const pageSetting = (row: { enabled: boolean; content: string } | null): PageSetting => ({ enabled: !!row?.enabled, indexable: !!row?.enabled && row.content === "index" });
