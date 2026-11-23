import type { LegalSection, LegalSeo } from "../content";
import { SEED_CATEGORIES, SEED_DOCUMENTS } from "./index";
import type { SeedDoc } from "./helpers";

export const seedCode = (n: number) => `OSTA-LEG-${String(n).padStart(3, "0")}`;

export const toSections = (d: SeedDoc): LegalSection[] =>
  d.sections.map(([level, headingEn, headingAr, bodyEn, bodyAr], i) => ({ id: `s${i + 1}`, level, headingEn, headingAr, bodyEn, bodyAr }));

export const toSeo = (d: SeedDoc): LegalSeo => ({ titleEn: d.seoTitleEn, titleAr: d.seoTitleAr, descriptionEn: d.seoDescEn, descriptionAr: d.seoDescAr });

export const categoryOrder = (key: string) => SEED_CATEGORIES.findIndex((c) => c.key === key);
export { SEED_CATEGORIES, SEED_DOCUMENTS };
