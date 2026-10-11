"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/pricing", label: "Prices & Services" },
  { href: "/admin/pricing/discounts", label: "Discounts" },
  { href: "/admin/pricing/booking-types", label: "Booking Types" },
  { href: "/admin/pricing/settings", label: "Tax & Visit Fee" },
  { href: "/admin/pricing/visit-fees", label: "Visit Fee Review" },
];

export function PricingTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
            pathname === tab.href ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
