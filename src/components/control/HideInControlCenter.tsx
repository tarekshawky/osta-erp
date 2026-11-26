"use client";

import { usePathname } from "next/navigation";
import { isControlCenterPath } from "@/lib/controlCenter/workspaces";

// The Control Center has its own header, so the ERP page header is not drawn on its screens.
export function HideInControlCenter({ children }: { children: React.ReactNode }) {
  return isControlCenterPath(usePathname()) ? null : children;
}
