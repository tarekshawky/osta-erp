import type { Category, LeadSource } from "@/lib/invoiceData";

export type CustomerFormData = {
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  companyName: string;
  trn: string;
  phone: string;
  emirate: string;
  buildingName: string;
  flatNo: string;
  leadSource: LeadSource;
};

export type ServiceItemFormData = {
  service: string;
  customName: string;
  description: string;
  qty: string;
  unitPrice: string;
};

// Separate from ServiceFormData.items (billable service lines) -- Inventory
// Used only ever deducts stock, it never creates or affects a billable
// InvoiceItem/revenue row. Kept fully independent by design.
export type InventoryUsageItemFormData = {
  inventoryItemId: string;
  quantity: string;
};

export type ServiceFormData = {
  serviceType: "Repair" | "Inspection";
  category: Category;
  items: ServiceItemFormData[];
  inventoryEmployeeId: string;
  inventoryUsage: InventoryUsageItemFormData[];
};

export type PaymentFormData = {
  method: "Cash" | "Bank Transfer" | "Ziina";
  date: string;
  teamId: string;
};

export const emptyCustomer: CustomerFormData = {
  type: "INDIVIDUAL",
  name: "",
  companyName: "",
  trn: "",
  phone: "",
  emirate: "Dubai",
  buildingName: "",
  flatNo: "",
  leadSource: "Organic",
};

export const emptyServiceItem: ServiceItemFormData = {
  service: "",
  customName: "",
  description: "",
  qty: "1",
  unitPrice: "",
};

export const emptyInventoryUsageItem: InventoryUsageItemFormData = {
  inventoryItemId: "",
  quantity: "",
};

export const emptyService: ServiceFormData = {
  serviceType: "Repair",
  category: "AC",
  items: [{ ...emptyServiceItem }],
  inventoryEmployeeId: "",
  inventoryUsage: [],
};

export const emptyPayment: PaymentFormData = {
  method: "Cash",
  date: new Date().toISOString().slice(0, 10),
  teamId: "",
};

export type CreateInvoiceResult = {
  ok: boolean;
  number?: string;
  amount?: number;
  error?: string;
};
