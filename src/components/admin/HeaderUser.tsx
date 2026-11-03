"use client";

import { initials } from "@/lib/format";
import { useAdminUser } from "./AdminUserContext";

// Avatar, name and role at the right of the header.
export function HeaderUser() {
  const { name, isSuperAdmin } = useAdminUser();
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2A6B] text-sm font-semibold text-white">{initials(name)}</span>
      <span className="hidden leading-tight lg:block">
        <span className="block max-w-40 truncate text-sm font-semibold text-[#0B1F4D]">{name}</span>
        <span className="block text-[11px] text-[#4A5B80]">{isSuperAdmin ? "Super Admin" : "Admin"}</span>
      </span>
    </div>
  );
}
