"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { EMIRATES } from "@/lib/invoiceData";
import { createOrder, type OrderCustomerInput } from "@/app/admin/orders/actions";

type TeamOption = { id: string; name: string };
type EmployeeOption = { id: string; name: string; code: string };

const emptyCustomer: OrderCustomerInput = {
  type: "INDIVIDUAL",
  name: "",
  companyName: "",
  trn: "",
  phone: "",
  emirate: "Dubai",
  buildingName: "",
  flatNo: "",
};

export function OrderForm({
  teamOptions,
  employeeOptions,
}: {
  teamOptions: TeamOption[];
  employeeOptions: EmployeeOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<OrderCustomerInput>(emptyCustomer);
  const [teamId, setTeamId] = useState(teamOptions[0]?.id ?? "");
  const [assignedToId, setAssignedToId] = useState(employeeOptions[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  const isValid = customer.phone.trim().length >= 7 && billName.length > 0 && assignedToId.length > 0;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await createOrder(customer, teamId, assignedToId, notes, scheduledAt);
      if (res.ok && res.id) {
        showToast("Order created.");
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team">
          <select className={inputClassName} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assign To">
          <select className={inputClassName} value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
            <option value="">Select employee</option>
            {employeeOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} · {emp.code}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Scheduled Date & Time (Optional)">
        <input
          type="datetime-local"
          className={inputClassName}
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </Field>

      <Field label="Notes (Optional)">
        <textarea
          className={inputClassName}
          rows={3}
          placeholder="Any extra details about this order"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-2 w-full rounded-xl bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3.5"
      >
        {isPending ? "Creating..." : "Create Order"}
      </button>
    </div>
  );
}
