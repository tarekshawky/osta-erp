export const EXPENSE_CATEGORIES = [
  "Fuel",
  "Parking",
  "Salik",
  "Tools",
  "Materials",
  "Office",
  "Spare Parts",
  "Other",
] as const;

export const EXPENSE_PAYMENT_METHODS = ["Cash", "Bank", "Ziina"] as const;

export const EXPENSE_CATEGORY_STYLES: Record<string, string> = {
  Fuel: "bg-orange-50 text-orange-600",
  Parking: "bg-sky-50 text-sky-600",
  Salik: "bg-purple-50 text-purple-600",
  Tools: "bg-slate-100 text-slate-600",
  Materials: "bg-teal-50 text-teal-600",
  Office: "bg-indigo-50 text-indigo-600",
  "Spare Parts": "bg-amber-50 text-amber-600",
  Other: "bg-rose-50 text-rose-600",
};
