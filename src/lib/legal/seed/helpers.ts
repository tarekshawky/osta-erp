import { TERMS } from "./termsClauses";
import type { DocKind } from "../content";

// A section as written in the seed files: [level, English heading, Arabic heading, English text, Arabic text].
export type S = [1 | 2 | 3, string, string, string, string];

export type SeedDoc = {
  number: number;
  slug: string;
  cat: "A" | "B" | "C" | "D" | "E" | "F";
  kind: DocKind;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  introEn: string;
  introAr: string;
  sections: S[];
  related: string[];
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescEn: string;
  seoDescAr: string;
};

// One clause of the live Terms & Conditions (see termsClauses.ts), reused as it is written there.
export const t = (n: number): S => {
  const c = TERMS[n];
  if (!c) throw new Error(`No live Terms clause ${n}`);
  return [2, c[0], c[1], c[2], c[3]];
};
export const live = (...nums: number[]): S[] => nums.map(t);

// A clause written for the Legal Center.
export const cl = (headingEn: string, headingAr: string, bodyEn: string, bodyAr: string): S => [2, headingEn, headingAr, bodyEn, bodyAr];
// A part heading (not numbered), optionally with a short text.
export const part = (headingEn: string, headingAr: string, bodyEn = "", bodyAr = ""): S => [1, headingEn, headingAr, bodyEn, bodyAr];

// The sentence every document opens with: who the policy comes from. Filled from the confirmed company details.
export const COMPANY_EN = "{{company_name_en}} (“{{brand_name_en}}”, “we”, “us”), licence no. {{license_number}}";
export const COMPANY_AR = "{{company_name_ar}} («{{brand_name_ar}}» أو «نحن»)، رخصة تجارية رقم {{license_number}}";
