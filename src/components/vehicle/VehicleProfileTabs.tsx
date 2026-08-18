"use client";

import { useState } from "react";
import { VehicleOverviewPanel, type TimelineExpense } from "./VehicleOverviewPanel";
import { VehicleExpensesTable, type VehicleExpenseRow } from "./VehicleExpensesTable";
import { VehicleServiceTable } from "./VehicleServiceTable";
import { VehicleFuelTable } from "./VehicleFuelTable";
import { VehicleFinesTable, type FineRow } from "./VehicleFinesTable";
import { VehicleMileageLog } from "./VehicleMileageLog";
import { VehicleDocumentsPanel } from "./VehicleDocumentsPanel";
import type { ServiceRow, FuelRow, FuelSummary, OdometerLogRow, ServiceDueStatus, VehicleDocumentRow } from "@/lib/vehicleData";

type Tab = "overview" | "expenses" | "service" | "fuel" | "fines" | "mileage" | "documents";

export function VehicleProfileTabs({
  currentOdometer,
  lastServiceOdometer,
  nextServiceOdometer,
  serviceDueStatus,
  expenseTotals,
  timeline,
  expenses,
  serviceHistory,
  fuelHistory,
  fuelSummary,
  fines,
  mileageLog,
  documents,
}: {
  currentOdometer: number;
  lastServiceOdometer: number | null;
  nextServiceOdometer: number | null;
  serviceDueStatus: ServiceDueStatus;
  expenseTotals: Record<string, number> & { grandTotal: number };
  timeline: TimelineExpense[];
  expenses: VehicleExpenseRow[];
  serviceHistory: ServiceRow[];
  fuelHistory: FuelRow[];
  fuelSummary: FuelSummary;
  fines: FineRow[];
  mileageLog: OdometerLogRow[];
  documents: { registrationDocUrl: string | null; insuranceDocUrl: string | null; byType: Record<string, VehicleDocumentRow[]> };
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "expenses", label: `Expenses (${expenses.length})` },
    { id: "service", label: `Service (${serviceHistory.length})` },
    { id: "fuel", label: `Fuel (${fuelHistory.length})` },
    { id: "fines", label: `Fines (${fines.length})` },
    { id: "mileage", label: "Mileage" },
    { id: "documents", label: "Documents" },
  ];

  return (
    <div>
      <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === t.id ? "bg-blue-700 text-white" : "text-slate-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "overview" && (
          <VehicleOverviewPanel
            currentOdometer={currentOdometer}
            lastServiceOdometer={lastServiceOdometer}
            nextServiceOdometer={nextServiceOdometer}
            serviceDueStatus={serviceDueStatus}
            expenseTotals={expenseTotals}
            timeline={timeline}
          />
        )}
        {tab === "expenses" && <VehicleExpensesTable expenses={expenses} />}
        {tab === "service" && <VehicleServiceTable history={serviceHistory} />}
        {tab === "fuel" && <VehicleFuelTable history={fuelHistory} summary={fuelSummary} />}
        {tab === "fines" && <VehicleFinesTable fines={fines} />}
        {tab === "mileage" && <VehicleMileageLog log={mileageLog} />}
        {tab === "documents" && (
          <VehicleDocumentsPanel
            registrationDocUrl={documents.registrationDocUrl}
            insuranceDocUrl={documents.insuranceDocUrl}
            byType={documents.byType}
          />
        )}
      </div>
    </div>
  );
}
