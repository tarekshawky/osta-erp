"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed } from "@/lib/format";
import type { RentalAgreementRow, RentalTransactionRow, RentalAlert, CustomerRentalSummary } from "@/lib/rentalData";
import { RentalAlertsBanner } from "./RentalAlertsBanner";
import { RentalAgreementForm, type RentalAgreementFormValue } from "./RentalAgreementForm";
import { RentalAgreementsList } from "./RentalAgreementsList";
import { RentalTransactionsTable } from "./RentalTransactionsTable";
import {
  createRentalAgreement,
  updateRentalAgreement,
  renewRentalAgreement,
  type RentalAgreementFormInput,
} from "@/app/admin/rental-expenses/actions";

const emptyFormValue: RentalAgreementFormValue = {
  agreementName: "",
  rentalType: "Accommodation",
  monthlyRent: 0,
  paymentFrequency: "Monthly",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  paymentDueDay: 1,
  paymentMethod: "Bank Transfer",
  notes: "",
  status: "Active",
};

function toFormValue(a: RentalAgreementRow): RentalAgreementFormValue {
  return {
    agreementName: a.agreementName,
    rentalType: a.rentalType,
    monthlyRent: a.monthlyRent,
    paymentFrequency: a.paymentFrequency,
    startDate: a.startDate.toISOString().slice(0, 10),
    endDate: a.endDate ? a.endDate.toISOString().slice(0, 10) : "",
    paymentDueDay: 1,
    paymentMethod: a.paymentMethod,
    notes: a.notes ?? "",
    status: a.status,
  };
}

function SummaryCard({ label, value, valueClassName }: { label: string; value: string; valueClassName: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${valueClassName}`}>{value}</div>
    </div>
  );
}

export function CustomerRentalSection({
  customerId,
  relationshipLabel,
  financials,
  rentalSummary,
  agreements,
  transactions,
  alerts,
}: {
  customerId: string;
  relationshipLabel: string;
  financials: { totalRevenue: number; paidAmount: number; outstandingAmount: number };
  rentalSummary: CustomerRentalSummary;
  agreements: RentalAgreementRow[];
  transactions: RentalTransactionRow[];
  alerts: RentalAlert[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit" | "renew">("closed");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filteredAgreementId, setFilteredAgreementId] = useState<string | null>(null);

  function openAdd() {
    setActiveId(null);
    setMode("add");
  }
  function openEdit(id: string) {
    setActiveId(id);
    setMode("edit");
  }
  function openRenew(id: string) {
    setActiveId(id);
    setMode("renew");
  }
  function close() {
    setMode("closed");
    setActiveId(null);
  }

  async function handleSave(value: RentalAgreementFormValue) {
    const input: RentalAgreementFormInput = { ...value, customerId };
    const res =
      mode === "edit" && activeId
        ? await updateRentalAgreement(activeId, input)
        : mode === "renew" && activeId
          ? await renewRentalAgreement(activeId, input)
          : await createRentalAgreement(input);
    if (res.ok) {
      showToast(mode === "edit" ? "Rental agreement updated." : mode === "renew" ? "Rental agreement renewed." : "Rental agreement added.");
      close();
      router.refresh();
    }
    return res;
  }

  const activeAgreement = activeId ? agreements.find((a) => a.id === activeId) : null;
  const netFinancial = financials.totalRevenue - rentalSummary.totalPaidLifetime;
  const shownTransactions = filteredAgreementId ? transactions.filter((t) => t.rentalAgreementId === filteredAgreementId) : transactions;

  return (
    <div>
      <RentalAlertsBanner alerts={alerts} />

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-slate-500">Financial Relationship</div>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">{relationshipLabel}</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-3">Financial Summary</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <SummaryCard label="Service Revenue" value={formatAed(financials.totalRevenue)} valueClassName="text-slate-900" />
        <SummaryCard label="Payments Received" value={formatAed(financials.paidAmount)} valueClassName="text-green-600" />
        <SummaryCard label="Outstanding Receivable" value={formatAed(financials.outstandingAmount)} valueClassName="text-orange-500" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <SummaryCard label="Rental Expense (Paid)" value={formatAed(rentalSummary.totalPaidLifetime)} valueClassName="text-red-500" />
        <SummaryCard label="Outstanding Rental" value={formatAed(rentalSummary.outstandingRental)} valueClassName="text-orange-500" />
        <SummaryCard label="Total Paid to Customer" value={formatAed(rentalSummary.totalPaidLifetime)} valueClassName="text-red-500" />
      </div>
      <div className="grid grid-cols-1 gap-3 mb-5">
        <SummaryCard
          label="Net Financial Relationship (Revenue − Expenses Paid to Customer)"
          value={formatAed(netFinancial)}
          valueClassName={netFinancial >= 0 ? "text-green-600" : "text-red-500"}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Rental Agreements</h3>
        {mode === "closed" && (
          <button type="button" onClick={openAdd} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            + Add Rental Agreement
          </button>
        )}
      </div>

      {mode === "add" && <RentalAgreementForm initial={emptyFormValue} onSave={handleSave} onCancel={close} />}
      {mode === "edit" && activeAgreement && (
        <RentalAgreementForm initial={toFormValue(activeAgreement)} onSave={handleSave} onCancel={close} />
      )}
      {mode === "renew" && activeAgreement && (
        <RentalAgreementForm
          initial={{ ...toFormValue(activeAgreement), startDate: new Date().toISOString().slice(0, 10), endDate: "", status: "Active" }}
          onSave={handleSave}
          onCancel={close}
        />
      )}

      <RentalAgreementsList
        agreements={agreements}
        onEdit={openEdit}
        onRenew={openRenew}
        onViewTransactions={setFilteredAgreementId}
        filteredAgreementId={filteredAgreementId}
      />

      <h3 className="text-sm font-semibold text-slate-900 mt-6 mb-3">
        Transactions{filteredAgreementId ? ` — ${agreements.find((a) => a.id === filteredAgreementId)?.agreementName ?? ""}` : ""}
      </h3>
      <RentalTransactionsTable transactions={shownTransactions} showCompany={false} />
    </div>
  );
}
