import { CATEGORY_SLUG_WORD, EMIRATE_LABEL, type EmirateKey } from "./constants";

// {category}-{emirate}-{number}, for example painter-ajman-123. Lowercase, URL safe, unique because the job number is.
export function jobSlug(categoryKey: string, emirate: EmirateKey, number: number): string {
  const word = CATEGORY_SLUG_WORD[categoryKey] ?? (categoryKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "job");
  return `${word}-${EMIRATE_LABEL[emirate].slug}-${number}`;
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
