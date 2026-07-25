export const DEVICE_TYPES = ["Split AC", "Window AC", "Central AC", "Ducted AC", "Package Unit", "Other"] as const;

export const TONNAGE_OPTIONS = ["1 Ton", "1.5 Ton", "2 Ton", "2.5 Ton", "3 Ton", "4 Ton", "5 Ton", "Other"] as const;

export const GAS_TYPES = ["R22", "R410A", "R32", "R134A", "Other"] as const;

export const CONDITIONS = ["Poor", "Medium", "Good", "Excellent"] as const;

export const CONDITION_STYLES: Record<string, string> = {
  Poor: "bg-red-50 text-red-500",
  Medium: "bg-amber-50 text-amber-600",
  Good: "bg-sky-50 text-sky-600",
  Excellent: "bg-green-50 text-green-700",
};

export const MAX_PHOTOS_PER_ITEM = 3;
