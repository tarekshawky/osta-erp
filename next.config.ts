import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Long articles and pages are saved through server actions; the default 1 MB would cut them off.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
