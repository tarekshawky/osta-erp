import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

// While the website and the dashboard live on different addresses, the old address can send every /jobs link to the new one
// with a permanent (301) redirect. It does nothing until LEGACY_JOBS_DOMAIN is set (for example "osta-invoices.vercel.app")
// together with PUBLIC_JOBS_BASE_URL (for example "https://www.ostaservices.com").
const legacyDomain = process.env.LEGACY_JOBS_DOMAIN?.trim();
const newBase = (process.env.PUBLIC_JOBS_BASE_URL?.trim() || process.env.SITE_URL?.trim())?.replace(/\/+$/, "");
const jobsPath = process.env.PUBLIC_JOBS_PATH?.trim() ? `/${process.env.PUBLIC_JOBS_PATH.trim().replace(/^\/+|\/+$/g, "")}` : "/join-osta-team/jobs";

const nextConfig: NextConfig = {
  poweredByHeader: false, // do not announce the framework in every response
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  // The agreement PDFs are drawn by a serverless Chromium whose binary is read from disk at run time, so the functions that make
  // PDFs must ship it along.
  outputFileTracingIncludes: {
    "/api/v1/maintenance-builder/submit": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/agreements/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/me/contracts/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin/contracts": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin/contracts/**": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/ac-quote": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/ac-quote/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/duct-quote": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/duct-quote/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/split-quote": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/v1/split-quote/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin/self-quotes": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin/self-quotes/**": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  // Long articles and pages are saved through server actions; the default 1 MB would cut them off.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // The public job pages are served on the website at /join-osta-team/jobs. The dashboard answers on that path as well,
  // so a shared link works whichever address it was built from.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/join-osta-team/jobs", destination: "/jobs" },
        { source: "/join-osta-team/jobs/:path*", destination: "/jobs/:path*" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    if (!legacyDomain || !newBase) return [];
    return [
      { source: "/jobs", has: [{ type: "host", value: legacyDomain }], destination: `${newBase}${jobsPath}`, statusCode: 301 },
      { source: "/jobs/:path*", has: [{ type: "host", value: legacyDomain }], destination: `${newBase}${jobsPath}/:path*`, statusCode: 301 },
    ];
  },
};

export default nextConfig;
