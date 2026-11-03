import type { ReactNode } from "react";
export type NavIcon =
  | "dashboard" | "orders" | "hr" | "jobs" | "finance" | "reports" | "marketing" | "website" | "fleet" | "inventory" | "system" | "sales" | "customers" | "rentals";

const ICONS: Record<NavIcon, ReactNode> = {
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  orders: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  hr: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M15.5 14.2c2.5.4 4.5 2.7 4.5 5.8" strokeLinecap="round" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v.01M18 15v.01" strokeLinecap="round" />
    </>
  ),
  reports: <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />,
  marketing: <path d="M3 11l18-7-7 18-2-8-9-3z" strokeLinejoin="round" />,
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
    </>
  ),
  jobs: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  fleet: (
    <>
      <path d="M4 16v-4l2-5a2 2 0 012-1h8a2 2 0 012 1l2 5v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16h18v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" strokeLinejoin="round" />
      <circle cx="7.5" cy="16" r="1.5" />
      <circle cx="16.5" cy="16" r="1.5" />
    </>
  ),
  inventory: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sales: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5l5 3 5-4 6 3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  customers: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
      <path d="M17.5 4.5l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  rentals: (
    <>
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h7M9 17h5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  system: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function ModuleIcon({ name, size = 18, className = "shrink-0" }: { name: NavIcon; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      {ICONS[name]}
    </svg>
  );
}
