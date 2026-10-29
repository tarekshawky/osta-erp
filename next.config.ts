import type { NextConfig } from "next";

// While the website and the dashboard live on different addresses, the old address can send every /jobs link to the new one
// with a permanent (301) redirect. It does nothing until LEGACY_JOBS_DOMAIN is set (for example "osta-invoices.vercel.app")
// together with PUBLIC_JOBS_BASE_URL (for example "https://www.ostaservices.com").
const legacyDomain = process.env.LEGACY_JOBS_DOMAIN?.trim();
const newBase = process.env.PUBLIC_JOBS_BASE_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Long articles and pages are saved through server actions; the default 1 MB would cut them off.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async redirects() {
    if (!legacyDomain || !newBase) return [];
    return [
      { source: "/jobs", has: [{ type: "host", value: legacyDomain }], destination: `${newBase}/jobs`, statusCode: 301 },
      { source: "/jobs/:path*", has: [{ type: "host", value: legacyDomain }], destination: `${newBase}/jobs/:path*`, statusCode: 301 },
    ];
  },
};

export default nextConfig;
