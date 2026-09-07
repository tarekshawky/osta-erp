// Governs whether an employee can see Invoices/Expenses at all, and if so,
// whether they're scoped to records they created themselves or every record
// company-wide (both teams, same visibility an Admin has). Employee.
// invoicesAccess / expensesAccess.
export const RECORD_ACCESS_LEVELS = ["No Access", "Own Records Only", "All Records"] as const;

export type RecordAccessLevel = (typeof RECORD_ACCESS_LEVELS)[number];
