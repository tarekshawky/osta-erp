import { EMIRATE_LABEL } from "./constants";
import type { PublicJobRow } from "./publicJob";
import { jobPublicUrl } from "./urls";
import type { Lang } from "./publicText";

const stripHtml = (h: string | null) => (h ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// schema.org JobPosting for an OPEN job, built only from fields the admin provided: no invented salary or benefits.
export function jobPostingJsonLd(j: PublicJobRow, lang: Lang): Record<string, unknown> | null {
  if (!j.slug || !j.publishedAt) return null;
  const title = (lang === "ar" ? j.titleAr || j.titleEn : j.titleEn || j.titleAr) || (lang === "ar" ? j.category.nameAr : j.category.nameEn);
  const description = stripHtml(lang === "ar" ? j.descriptionAr || j.descriptionEn : j.descriptionEn || j.descriptionAr) || title;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description,
    datePosted: j.publishedAt.toISOString(),
    employmentType: j.type === "PERMANENT" ? "FULL_TIME" : "TEMPORARY",
    hiringOrganization: { "@type": "Organization", name: "Osta Services" },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.area || EMIRATE_LABEL[j.emirate].en, addressRegion: EMIRATE_LABEL[j.emirate].en, addressCountry: "AE" } },
    url: jobPublicUrl(j.slug),
    totalJobOpenings: j.workersRequired,
  };
  if (j.applicationDeadline) ld.validThrough = j.applicationDeadline.toISOString();
  if (j.type === "PERMANENT" && (j.monthlySalaryMin !== null || j.monthlySalaryMax !== null)) {
    ld.baseSalary = { "@type": "MonetaryAmount", currency: "AED", value: { "@type": "QuantitativeValue", unitText: "MONTH", ...(j.monthlySalaryMin !== null ? { minValue: Number(j.monthlySalaryMin) } : {}), ...(j.monthlySalaryMax !== null ? { maxValue: Number(j.monthlySalaryMax) } : {}) } };
  } else if (j.type === "DAILY" && j.dailyWage !== null) {
    ld.baseSalary = { "@type": "MonetaryAmount", currency: "AED", value: { "@type": "QuantitativeValue", unitText: "DAY", value: Number(j.dailyWage) } };
  }
  return ld;
}
