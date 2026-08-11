"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { EMIRATES } from "@/lib/invoiceData";
import { ORDER_TYPES, PRICE_AGREED_OPTIONS, CUSTOMER_LANGUAGES } from "@/lib/orderData";
import { createOrder, updateOrder, type OrderCustomerInput, type OrderDetailsInput } from "@/app/admin/orders/actions";

type TeamOption = { id: string; name: string };
type EmployeeOption = { id: string; name: string; code: string; teamId: string | null };

const emptyCustomer: OrderCustomerInput = {
  type: "INDIVIDUAL",
  name: "",
  companyName: "",
  trn: "",
  phone: "",
  whatsapp: "",
  emirate: "Dubai",
  buildingName: "",
  flatNo: "",
};

function emptyDetails(teamOptions: TeamOption[], employeeOptions: EmployeeOption[]): OrderDetailsInput {
  const teamId = teamOptions[0]?.id ?? "";
  return {
    teamId,
    assignedToId: employeeOptions.find((e) => e.teamId === teamId)?.id ?? "",
    notes: "",
    scheduledAt: "",
    locationUrl: "",
    orderType: ORDER_TYPES[0],
    priceAgreed: PRICE_AGREED_OPTIONS[1],
    customerLanguage: CUSTOMER_LANGUAGES[0],
  };
}

export function OrderForm({
  teamOptions,
  employeeOptions,
  mode = "create",
  editOrderId,
  initialCustomer,
  initialDetails,
}: {
  teamOptions: TeamOption[];
  employeeOptions: EmployeeOption[];
  mode?: "create" | "edit";
  editOrderId?: string;
  initialCustomer?: OrderCustomerInput;
  initialDetails?: OrderDetailsInput;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<OrderCustomerInput>(initialCustomer ?? emptyCustomer);
  const [details, setDetails] = useState<OrderDetailsInput>(initialDetails ?? emptyDetails(teamOptions, employeeOptions));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  const isValid = customer.phone.trim().length >= 7 && billName.length > 0 && details.assignedToId.length > 0;
  const teamEmployees = employeeOptions.filter((emp) => emp.teamId === details.teamId);

  function handleTeamChange(teamId: string) {
    const stillAssigned = employeeOptions.some((emp) => emp.id === details.assignedToId && emp.teamId === teamId);
    setDetails({
      ...details,
      teamId,
      assignedToId: stillAssigned ? details.assignedToId : employeeOptions.find((emp) => emp.teamId === teamId)?.id ?? "",
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "edit" && editOrderId
          ? await updateOrder(editOrderId, customer, details)
          : await createOrder(customer, details);
      if (res.ok && res.id) {
        showToast(mode === "edit" ? "Order updated." : "Order created.");
        router.push(`/admin/orders/${res.id}`);
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
          <Field label="Company Name">
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
        <Field label="Customer Name">
          <input
            className={inputClassName}
            placeholder="Enter full name"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
        </Field>
      )}

      <Field label="Phone Number">
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

      <Field label="Emirate">
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
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Building Name">
          <input
            className={inputClassName}
            placeholder="Enter building name"
            value={customer.buildingName}
            onChange={(e) => setCustomer({ ...customer, buildingName: e.target.value })}
          />
        </Field>
        <Field label={customer.type === "COMPANY" ? "Flat/Office No" : "Flat/Apartment No"}>
          <input
            className={inputClassName}
            placeholder="Enter number"
            value={customer.flatNo}
            onChange={(e) => setCustomer({ ...customer, flatNo: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Location Link (Google Maps, optional)">
        <input
          className={inputClassName}
          placeholder="Paste Google Maps link"
          value={details.locationUrl}
          onChange={(e) => setDetails({ ...details, locationUrl: e.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team">
          <select className={inputClassName} value={details.teamId} onChange={(e) => handleTeamChange(e.target.value)}>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assign To">
          <select
            className={inputClassName}
            value={details.assignedToId}
            onChange={(e) => setDetails({ ...details, assignedToId: e.target.value })}
          >
            <option value="">Select employee</option>
            {teamEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} · {emp.code}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order Type">
          <select
            className={inputClassName}
            value={details.orderType}
            onChange={(e) => setDetails({ ...details, orderType: e.target.value })}
          >
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price Agreed">
          <select
            className={inputClassName}
            value={details.priceAgreed}
            onChange={(e) => setDetails({ ...details, priceAgreed: e.target.value })}
          >
            {PRICE_AGREED_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Customer Language">
        <select
          className={inputClassName}
          value={details.customerLanguage}
          onChange={(e) => setDetails({ ...details, customerLanguage: e.target.value })}
        >
          {CUSTOMER_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Scheduled Date & Time (Optional)">
        <input
          type="datetime-local"
          className={inputClassName}
          value={details.scheduledAt}
          onChange={(e) => setDetails({ ...details, scheduledAt: e.target.value })}
        />
      </Field>

      <Field label="Notes (Optional)">
        <textarea
          className={inputClassName}
          rows={3}
          placeholder="Any extra details about this order"
          value={details.notes}
          onChange={(e) => setDetails({ ...details, notes: e.target.value })}
        />
      </Field>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-2 w-full rounded-xl bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3.5"
      >
        {isPending ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save Changes" : "Create Order"}
      </button>
    </div>
  );
}
