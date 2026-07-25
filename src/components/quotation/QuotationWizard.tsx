"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/invoice/StepHeader";
import { CustomerStep } from "@/components/invoice/CustomerStep";
import { ServiceStep } from "@/components/invoice/ServiceStep";
import { QuotationPreviewCard } from "./QuotationPreviewCard";
import { createQuotationFromWizard, updateQuotationFromWizard } from "@/app/actions/quotation";
import { emptyCustomer, emptyService, type CustomerFormData, type ServiceFormData } from "@/components/invoice/types";
import { CUSTOM_SERVICE_VALUE } from "@/lib/invoiceData";
import { formatAed, formatUaePhone } from "@/lib/format";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";

const STEP_META = [{ subtitle: "Customer" }, { subtitle: "Service" }, { subtitle: "Preview" }];

export function QuotationWizard({
  basePath,
  createdByName,
  mode = "create",
  editQuotationId,
  initialCustomer,
  initialService,
}: {
  basePath: "/admin" | "/employee";
  createdByName: string;
  mode?: "create" | "edit";
  editQuotationId?: string;
  initialCustomer?: CustomerFormData;
  initialService?: ServiceFormData;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<CustomerFormData>(initialCustomer ?? emptyCustomer);
  const [service, setService] = useState<ServiceFormData>(initialService ?? emptyService);
  const [result, setResult] = useState<{ number: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = mode === "edit";
  const listHref = basePath === "/admin" ? "/admin/quotations" : "/employee";
  const exitHref = isEdit && editQuotationId ? `${basePath}/quotations/${editQuotationId}` : listHref;

  function reset() {
    setCustomer(emptyCustomer);
    setService(emptyService);
    setResult(null);
    setError(null);
    setStep(0);
  }

  function handleBack() {
    if (step === 0) {
      router.push(exitHref);
    } else {
      setStep((s) => s - 1);
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res =
        isEdit && editQuotationId
          ? await updateQuotationFromWizard(editQuotationId, customer, service)
          : await createQuotationFromWizard(customer, service);
      if (res.ok && res.number) {
        setResult({ number: res.number, amount: res.amount ?? 0 });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  const previewItems = service.items
    .filter((item) => {
      const hasService = item.service === CUSTOM_SERVICE_VALUE ? item.customName.trim().length > 0 : item.service.length > 0;
      return hasService && Number(item.unitPrice) > 0;
    })
    .map((item) => ({
      serviceName: item.service === CUSTOM_SERVICE_VALUE ? item.customName : item.service,
      description: item.description || null,
      qty: Number(item.qty) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    }));

  const previewCustomer = {
    type: customer.type,
    name: customer.name,
    companyName: customer.companyName,
    trn: customer.trn,
    phone: formatUaePhone(customer.phone),
    emirate: customer.emirate,
    buildingName: customer.buildingName,
    flatNo: customer.flatNo,
  };

  if (result) {
    return (
      <div className="flex flex-col items-center px-5 py-8 gap-4">
        <div className="h-16 w-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? "Quotation Updated!" : "Quotation Created!"}</h2>
          <p className="text-sm text-slate-400 mt-1">{result.number}</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatAed(result.amount)}</p>
        </div>

        <div className="w-full" id="quotation-preview">
          <QuotationPreviewCard
            number={result.number}
            date={new Date()}
            customer={previewCustomer}
            items={previewItems}
            createdByName={createdByName}
          />
        </div>

        <div className="w-full flex gap-3">
          <DownloadPdfButton
            targetId="quotation-preview"
            fileName={result.number}
            label="Download PDF"
            className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 text-center"
          />
          {isEdit ? (
            <button
              onClick={() => router.push(exitHref)}
              className="flex-1 rounded-xl bg-blue-700 text-white px-5 py-2.5 text-sm font-medium"
            >
              View Quotation
            </button>
          ) : (
            <button
              onClick={reset}
              className="flex-1 rounded-xl bg-blue-700 text-white px-5 py-2.5 text-sm font-medium"
            >
              Create Another
            </button>
          )}
        </div>
        <button onClick={() => router.push(listHref)} className="text-sm text-slate-500">
          {basePath === "/admin" ? "Back to Quotations" : "Back to Home"}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 pb-10">
      <StepHeader
        title={isEdit ? "Edit Quotation" : "Create Quotation"}
        subtitle={STEP_META[step].subtitle}
        step={step + 1}
        totalSteps={3}
        onBack={handleBack}
      />
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {step === 0 && <CustomerStep value={customer} onChange={setCustomer} onNext={() => setStep(1)} />}
      {step === 1 && <ServiceStep value={service} onChange={setService} onNext={() => setStep(2)} />}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <QuotationPreviewCard
            number="DRAFT"
            isDraft
            date={new Date()}
            customer={previewCustomer}
            items={previewItems}
            createdByName={createdByName}
          />
          <button
            type="button"
            disabled={isPending || previewItems.length === 0}
            onClick={handleSave}
            className="w-full rounded-xl bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-3.5"
          >
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Save Quotation"}
          </button>
        </div>
      )}
    </div>
  );
}
