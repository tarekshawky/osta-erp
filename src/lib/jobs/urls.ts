// Every absolute URL of the Jobs module (share links, WhatsApp text, canonical, Open Graph, sitemap, emails) comes from
// ONE place. Moving to the final domain means changing PUBLIC_JOBS_BASE_URL only; no code change.
export function jobsBaseUrl(): string {
  const configured = process.env.PUBLIC_JOBS_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const jobsListUrl = () => `${jobsBaseUrl()}/jobs`;
export const jobPublicUrl = (slug: string) => `${jobsBaseUrl()}/jobs/${slug}`;
