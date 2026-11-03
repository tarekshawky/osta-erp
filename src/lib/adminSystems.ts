import { NAV_GROUPS, type NavGroup, type NavLeaf } from "./adminNav";

// The "systems" are simply the website's own sidebar groups (same names, same pages): this adds the card text and colour
// used by the dashboard cards and the system overview pages. No name here that the sidebar does not already have.
export type Tone = "blue" | "green" | "orange" | "purple" | "pink" | "teal" | "gray";

export const SYSTEM_META: Record<string, { text: string; tone: Tone }> = {
  orders: { text: "Orders, customers and billing", tone: "green" },
  hr: { text: "Manage your team", tone: "orange" },
  jobs: { text: "Hiring and workers", tone: "purple" },
  finance: { text: "Manage finances", tone: "green" },
  reports: { text: "View reports", tone: "blue" },
  marketing: { text: "Campaigns and blog", tone: "pink" },
  website: { text: "Manage your website", tone: "blue" },
  fleet: { text: "Manage your fleet", tone: "blue" },
  inventory: { text: "Manage services and stock", tone: "teal" },
  system: { text: "Control the system", tone: "gray" },
};

export const TONES: Record<Tone, { tile: string; text: string }> = {
  blue: { tile: "#E6EEFD", text: "#1E5BD8" },
  green: { tile: "#E3F6EC", text: "#138A4C" },
  orange: { tile: "#FFEEDF", text: "#C2560C" },
  purple: { tile: "#F0E8FD", text: "#7B3FE4" },
  pink: { tile: "#FDE7EE", text: "#C2185B" },
  teal: { tile: "#DFF5F8", text: "#0E7C8C" },
  gray: { tile: "#EDF0F5", text: "#3D4B66" },
};

export const systemHome = (id: string) => `/admin/systems/${id}`;
export const toneOfSystem = (id: string): Tone => SYSTEM_META[id]?.tone ?? "blue";
export const getSystem = (id: string): NavGroup | undefined => NAV_GROUPS.find((g) => g.id === id);

// The sidebar of one system: its overview first, then its pages (all existing pages).
export const OVERVIEW_LABEL = "Overview";
export const overviewLeaf = (id: string): NavLeaf => ({ href: systemHome(id), label: OVERVIEW_LABEL });
