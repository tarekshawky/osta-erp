import type { Metadata } from "next";

// The public jobs area lives at /jobs (never under /admin) so the addresses stay the same after the site moves to its final
// domain. The page chrome (header, language, direction) is drawn by each page through <PublicShell>, because only a page can
// read its own ?lang= parameter.
export const metadata: Metadata = { robots: { index: true, follow: true } };

export default function PublicJobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
