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

// itemType defaults to "Service" so every existing code path that never sets
// it keeps working unchanged. For "SparePart"/"Labour" lines, `customName`
// holds the catalog display name (there's no free-text service name to pick
// from), `originalPrice` is the catalog/default price at add-time, and
// `unitPrice` is the final, actually-charged price (editable only if the
// acting employee's price-modification permission allows it).
export type ServiceItemFormData = {
  itemType: "Service" | "SparePart" | "Labour";
  service: string;
  customName: string;
  description: string;
  qty: string;
  unitPrice: string;
  originalPrice: string;
  inventoryItemId: string;
  labourItemId: string;
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
  itemType: "Service",
  service: "",
  customName: "",
  description: "",
  qty: "1",
  unitPrice: "",
  originalPrice: "",
  inventoryItemId: "",
  labourItemId: "",
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
