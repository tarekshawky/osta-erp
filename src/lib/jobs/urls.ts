// Every absolute URL of the Jobs module (share links, WhatsApp text, canonical, Open Graph, emails) comes from ONE place.
// The public job pages live on the customer website (SITE_URL), under /join-osta-team/jobs. Moving to the final domain means
// changing PUBLIC_JOBS_BASE_URL (or SITE_URL) only; no code change.
const DEFAULT_WEBSITE = "https://osta-invoice-users.vercel.app";

export function jobsBaseUrl(): string {
  const configured = process.env.PUBLIC_JOBS_BASE_URL?.trim() || process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  // Deployed with nothing configured: the customer website, where the public jobs pages live. Set PUBLIC_JOBS_BASE_URL when
  // the website moves to its final domain.
  if (process.env.VERCEL) return DEFAULT_WEBSITE;
  return "http://localhost:3000";
}

// The path of the jobs list on the website. The dashboard answers on the same path too (see next.config.ts), so a link works
// even while the base address is still the dashboard's own.
export function jobsPath(): string {
  const configured = process.env.PUBLIC_JOBS_PATH?.trim();
  return configured ? `/${configured.replace(/^\/+|\/+$/g, "")}` : "/join-osta-team/jobs";
}

export const jobsListUrl = () => `${jobsBaseUrl()}${jobsPath()}`;
export const jobPublicUrl = (slug: string) => `${jobsBaseUrl()}${jobsPath()}/${slug}`;
