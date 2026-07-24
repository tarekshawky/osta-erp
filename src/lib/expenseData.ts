export const EXPENSE_CATEGORIES = [
  "Vehicle",
  "Advertising",
  "Materials",
  "Transportation",
  "Meals",
  "Accommodation",
  "Maintenance",
  "Other",
] as const;

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
  Other: "bg-rose-50 text-rose-600",
};
