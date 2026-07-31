export const EXPENSE_CATEGORIES = [
  "Vehicle",
  "Advertising",
  "Materials",
  "Transportation",
  "Meals",
  "Accommodation",
  "Maintenance",
  "Marketing Advertising",
  "Other",
] as const;

// Expenses tagged with this category feed the Marketing dashboard's Total Marketing
// Spend and campaign ROI figures (see src/lib/marketingData.ts). Kept distinct from
// the existing "Advertising" category so historical data there is unaffected.
export const MARKETING_EXPENSE_CATEGORY = "Marketing Advertising";

// Expense categories that directly relate to delivering the service (Cost of Services
// in the P&L sense). Everything else in EXPENSE_CATEGORIES is treated as an Operating
// Expense. This is a classification layer only -- it doesn't change the category list
// or any stored data, so existing expenses keep working unchanged.
export const COST_OF_SERVICES_CATEGORIES: readonly (typeof EXPENSE_CATEGORIES)[number][] = [
  "Materials",
  "Transportation",
];

export const VEHICLES = ["Dodge Journey", "Toyota Yaris", "Toyota Camry", "MG ZST"] as const;

export const VEHICLE_EXPENSE_TYPES = [
  "Fuel",
  "Repair",
  "Service",
  "Registration",
  "Insurance",
  "Car Wash",
  "Tires",
  "Battery",
  "Parking",
  "Salik",
  "DARB",
] as const;

export const ADVERTISING_PLATFORMS = ["Meta Ads", "Google Ads", "Meta Verified", "Others"] as const;

export const EXPENSE_PAYMENT_METHODS = ["Cash", "Bank", "Credit"] as const;

export const EXPENSE_CATEGORY_STYLES: Record<string, string> = {
  Vehicle: "bg-orange-50 text-orange-600",
  Advertising: "bg-sky-50 text-sky-600",
  Materials: "bg-teal-50 text-teal-600",
  Transportation: "bg-indigo-50 text-indigo-600",
  Meals: "bg-amber-50 text-amber-600",
  Accommodation: "bg-purple-50 text-purple-600",
  Maintenance: "bg-slate-100 text-slate-600",
  "Marketing Advertising": "bg-pink-50 text-pink-600",
  Other: "bg-rose-50 text-rose-600",
};
