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

export type ServiceFormData = {
  serviceType: "Repair" | "Inspection";
  category: Category;
  items: ServiceItemFormData[];
};

export type PaymentFormData = {
  method: "Cash" | "Bank Transfer" | "Ziina";
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

export const emptyService: ServiceFormData = {
  serviceType: "Repair",
  category: "AC",
  items: [{ ...emptyServiceItem }],
};

export const emptyPayment: PaymentFormData = {
  method: "Cash",
};

export type CreateInvoiceResult = {
  ok: boolean;
  number?: string;
  amount?: number;
  error?: string;
};
