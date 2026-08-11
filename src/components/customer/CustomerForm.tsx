"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { EMIRATES } from "@/lib/invoiceData";
import { CUSTOMER_LANGUAGES } from "@/lib/orderData";
import { BUILDING_TYPES, CUSTOMER_STATUSES } from "@/lib/customerData";
import { createCustomer, updateCustomer, type CustomerFormInput } from "@/app/admin/customers/actions";
import type { DuplicateMatch } from "@/lib/customerMatch";

const emptyCustomer: CustomerFormInput = {
  type: "INDIVIDUAL",
  name: "",
  companyName: "",
  trn: "",
  phone: "",
  whatsapp: "",
  email: "",
  language: "Arabic",
  emirate: "Dubai",
  city: "",
  area: "",
  buildingType: "",
  buildingName: "",
  flatNo: "",
  address: "",
  locationUrl: "",
  notes: "",
  status: "Active",
};

export function CustomerForm({
  mode = "create",
  editCustomerId,
  initialCustomer,
}: {
  mode?: "create" | "edit";
  editCustomerId?: string;
  initialCustomer?: CustomerFormInput;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<CustomerFormInput>(initialCustomer ?? emptyCustomer);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [isPending, startTransition] = useTransition();

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  const isValid = billName.length > 0 && customer.phone.trim().length >= 7 && customer.emirate.length > 0;

  function submit(force = false) {
    setError(null);
    startTransition(async () => {
      if (mode === "edit" && editCustomerId) {
        const res = await updateCustomer(editCustomerId, customer);
        if (res.ok) {
          showToast("Customer updated.");
          router.push(`/admin/customers/${editCustomerId}`);
        } else {
          setError(res.error ?? "Something went wrong.");
        }
        return;
      }

      const res = await createCustomer(customer, force);
      if (res.ok && res.id) {
        setDuplicate(null);
        showToast("Customer Created Successfully");
        router.push(`/admin/customers/${res.id}`);
      } else if (res.duplicate) {
        setDuplicate(res.duplicate);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Customer Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCustomer({ ...customer, type: "INDIVIDUAL" })}
            className={`rounded-xl border py-3 text-sm font-medium ${
              customer.type === "INDIVIDUAL" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
            }`}
          >
            Individual
          </button>
          <button
            type="button"
            onClick={() => setCustomer({ ...customer, type: "COMPANY" })}
            className={`rounded-xl border py-3 text-sm font-medium ${
              customer.type === "COMPANY" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
            }`}
          >
            Company
          </button>
        </div>
      </div>

      {customer.type === "COMPANY" && (
        <>
          <Field label="Company Name *">
            <input
              className={inputClassName}
              placeholder="Enter company name"
              value={customer.companyName}
              onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })}
            />
          </Field>
          <Field label="TRN (Optional)">
            <input
              className={inputClassName}
              placeholder="Enter TRN number"
              value={customer.trn}
              onChange={(e) => setCustomer({ ...customer, trn: e.target.value })}
            />
          </Field>
          <Field label="Contact Name">
            <input
              className={inputClassName}
              placeholder="Enter full name"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            />
          </Field>
        </>
      )}

      {customer.type === "INDIVIDUAL" && (
        <Field label="Customer Name *">
          <input
            className={inputClassName}
            placeholder="Enter full name"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
        </Field>
      )}

      <Field label="Phone Number *">
        <div className="flex gap-2">
          <span className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-500">+971</span>
          <input
            className={inputClassName}
            placeholder="5X XXX XXXX"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
        </div>
      </Field>

      <Field label="WhatsApp Number (Optional, if different from phone)">
        <div className="flex gap-2">
          <span className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-500">+971</span>
          <input
            className={inputClassName}
            placeholder="5X XXX XXXX"
            value={customer.whatsapp}
            onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })}
          />
        </div>
      </Field>

      <Field label="Email (Optional)">
        <input
          type="email"
          className={inputClassName}
          placeholder="customer@example.com"
          value={customer.email}
          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
        />
      </Field>

      <Field label="Language *">
        <select
          className={inputClassName}
          value={customer.language}
          onChange={(e) => setCustomer({ ...customer, language: e.target.value })}
        >
          {CUSTOMER_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Emirate *">
        <select
          className={inputClassName}
          value={customer.emirate}
          onChange={(e) => setCustomer({ ...customer, emirate: e.target.value })}
        >
          {EMIRATES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City (Optional)">
          <input
            className={inputClassName}
            placeholder="e.g. Al Nuaimiya"
            value={customer.city}
            onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
          />
        </Field>
        <Field label="Area (Optional)">
          <input
            className={inputClassName}
            placeholder="e.g. Al Rashidiya"
            value={customer.area}
            onChange={(e) => setCustomer({ ...customer, area: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Building Type (Optional)">
        <select
          className={inputClassName}
          value={customer.buildingType}
          onChange={(e) => setCustomer({ ...customer, buildingType: e.target.value })}
        >
          <option value="">Select building type</option>
          {BUILDING_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Building Name (Optional)">
          <input
            className={inputClassName}
            placeholder="Enter building name"
            value={customer.buildingName}
            onChange={(e) => setCustomer({ ...customer, buildingName: e.target.value })}
          />
        </Field>
        <Field label="Flat/Apartment No (Optional)">
          <input
            className={inputClassName}
            placeholder="Enter number"
            value={customer.flatNo}
            onChange={(e) => setCustomer({ ...customer, flatNo: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Full Address (Optional)">
        <textarea
          className={inputClassName}
          rows={2}
          placeholder="Full address, if the structured fields above aren't enough"
          value={customer.address}
          onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
        />
      </Field>

      <Field label="Google Maps Link (Optional)">
        <input
          className={inputClassName}
          placeholder="Paste Google Maps link"
          value={customer.locationUrl}
          onChange={(e) => setCustomer({ ...customer, locationUrl: e.target.value })}
        />
      </Field>

      <Field label="Customer Notes (Optional)">
        <textarea
          className={inputClassName}
          rows={3}
          placeholder="Internal notes about this customer"
          value={customer.notes}
          onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
        />
      </Field>

      {mode === "edit" && (
        <Field label="Customer Status">
          <select
            className={inputClassName}
            value={customer.status}
            onChange={(e) => setCustomer({ ...customer, status: e.target.value })}
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      )}

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={() => submit(false)}
        className="mt-2 w-full rounded-xl bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3.5"
      >
        {isPending ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save Changes" : "Create Customer"}
      </button>

      {duplicate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={() => setDuplicate(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900">Customer Already Exists</h3>
            <p className="mt-2 text-sm text-slate-500">
              A customer with this {duplicate.matchedOn} already exists.
            </p>
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <div className="font-semibold text-sm text-slate-900">{duplicate.customer.name}</div>
              <div className="text-xs text-slate-500">{duplicate.customer.code}</div>
              <div className="text-xs text-slate-500">{duplicate.customer.phone}</div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => router.push(`/admin/customers/${duplicate.customer.id}`)}
                className="w-full rounded-xl border border-slate-200 text-slate-700 font-medium text-sm py-2.5"
              >
                View Existing Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("Using existing customer.");
                  router.push(`/admin/customers/${duplicate.customer.id}`);
                }}
                className="w-full rounded-xl bg-blue-700 text-white font-medium text-sm py-2.5"
              >
                Use Existing Customer
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submit(true)}
                className="w-full rounded-xl border border-red-200 text-red-600 font-medium text-sm py-2.5"
              >
                {isPending ? "Creating..." : "Create Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
