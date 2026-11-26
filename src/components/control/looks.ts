import { Code2, Database, Image as ImageIcon, Inbox, LayoutDashboard, LayoutTemplate, MapPin, Plug, Search, SlidersHorizontal, Wrench, type LucideIcon } from "lucide-react";
import type { WorkspaceId } from "@/lib/controlCenter/workspaces";

// The coloured icon of each workspace (dock, search results and cards). Gradients follow the Control Center design.
export const LOOKS: Record<WorkspaceId, { icon: LucideIcon; gradient: string }> = {
  dashboard: { icon: LayoutDashboard, gradient: "from-[#6d9bff] to-[#2a50c8]" },
  builder: { icon: LayoutTemplate, gradient: "from-[#ff9f5f] to-[#ea5420]" },
  content: { icon: Database, gradient: "from-[#b08cff] to-[#6b3fe4]" },
  services: { icon: Wrench, gradient: "from-[#ffcb47] to-[#e08a00]" },
  locations: { icon: MapPin, gradient: "from-[#40e0a4] to-[#0d9a6c]" },
  seo: { icon: Search, gradient: "from-[#4fb4ff] to-[#1262d6]" },
  leads: { icon: Inbox, gradient: "from-[#ff8a8a] to-[#d93650]" },
  media: { icon: ImageIcon, gradient: "from-[#ffb978] to-[#f06a35]" },
  connect: { icon: Plug, gradient: "from-[#9edb35] to-[#198a3c]" },
  dev: { icon: Code2, gradient: "from-[#7586a6] to-[#1e293f]" },
  system: { icon: SlidersHorizontal, gradient: "from-[#a9b4c8] to-[#48536b]" },
};
