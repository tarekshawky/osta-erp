"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh flex bg-slate-50">
      <AdminSidebar adminName={adminName} open={open} onClose={() => setOpen(false)} />
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <button
          onClick={() => setOpen(true)}
          className="md:hidden m-3 self-start text-slate-600 rounded-lg border border-slate-200 bg-white p-2"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
