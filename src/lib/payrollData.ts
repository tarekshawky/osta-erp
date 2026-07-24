export const PAYROLL_TYPES = ["Salary", "Advance", "Deduction"] as const;

export const PAYROLL_TYPE_LABELS: Record<string, string> = {
  Salary: "Salary",
  Advance: "Salary in Advance",
  Deduction: "Cut Salary",
};

export const PAYROLL_TYPE_STYLES: Record<string, string> = {
  Salary: "bg-green-50 text-green-700",
  Advance: "bg-amber-50 text-amber-600",
  Deduction: "bg-red-50 text-red-500",
};
