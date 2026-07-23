"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "./StepHeader";
import { CustomerStep } from "./CustomerStep";
import { ServiceStep } from "./ServiceStep";
import { PaymentStep } from "./PaymentStep";
import { InvoicePreviewCard } from "./InvoicePreviewCard";
import { createInvoiceFromWizard, updateInvoiceFromWizard } from "@/app/actions/invoice";
import { emptyCustomer, emptyService, emptyPayment, type CustomerFormData, type ServiceFormData, type PaymentFormData } from "./types";
import { CUSTOM_SERVICE_VALUE } from "@/lib/invoiceData";
import { formatAed, formatUaePhone } from "@/lib/format";

const STEP_META = [
  { subtitle: "Customer" },
  { subtitle: "Service" },
  { subtitle: "Payment" },
  { subtitle: "Preview" },
];

export function InvoiceWizard({
  basePath,
  createdByName,
  mode = "create",
  editInvoiceId,
  initialCustomer,
  initialService,
  initialPayment,
}: {
  basePath: "/admin" | "/employee";
  createdByName: string;
  mode?: "create" | "edit";
  editInvoiceId?: string;
  initialCustomer?: CustomerFormData;
  initialService?: ServiceFormData;
  initialPayment?: PaymentFormData;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<CustomerFormData>(initialCustomer ?? emptyCustomer);
  const [service, setService] = useState<ServiceFormData>(initialService ?? emptyService);
  const [payment, setPayment] = useState<PaymentFormData>(initialPayment ?? emptyPayment);
  const [result, setResult] = useState<{ number: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exitHref = mode === "edit" ? `${basePath}/invoices/${editInvoiceId}` : `${basePath}/invoices`;

  function reset() {
    setCustomer(emptyCustomer);
    setService(emptyService);
    setPayment(emptyPayment);
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
        mode === "edit" && editInvoiceId
          ? await updateInvoiceFromWizard(editInvoiceId, customer, service, payment)
          : await createInvoiceFromWizard(customer, service, payment);
      if (res.ok && res.number) {
        setResult({ number: res.number, amount: res.amount ?? 0 });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  if (result) {
    const isEdit = mode === "edit";
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">{isEdit ? "Invoice Updated!" : "Invoice Created!"}</h2>
        <p className="text-sm text-slate-400 mt-1">{result.number}</p>
        <p className="text-2xl font-bold text-blue-700 mt-1">{formatAed(result.amount)}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(isEdit ? `${basePath}/invoices/${editInvoiceId}` : `${basePath}/invoices`)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700"
          >
            {isEdit ? "View Invoice" : "View Invoices"}
          </button>
          {!isEdit && (
            <button
              onClick={reset}
              className="rounded-xl bg-blue-700 text-white px-5 py-2.5 text-sm font-medium"
            >
              Create Another
            </button>
          )}
        </div>
      </div>
    );
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

  return (
    <div className="px-5 py-4 pb-10">
      <StepHeader
        title={mode === "edit" ? "Edit Invoice" : "Create Invoice"}
        subtitle={STEP_META[step].subtitle}
        step={step + 1}
        totalSteps={4}
        onBack={handleBack}
      />
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {step === 0 && <CustomerStep value={customer} onChange={setCustomer} onNext={() => setStep(1)} />}
      {step === 1 && <ServiceStep value={service} onChange={setService} onNext={() => setStep(2)} />}
      {step === 2 && (
        <PaymentStep value={payment} service={service} onChange={setPayment} onNext={() => setStep(3)} />
      )}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <InvoicePreviewCard
            number="DRAFT"
            isDraft
            date={new Date()}
            customer={{
              type: customer.type,
              name: customer.name,
              companyName: customer.companyName,
              trn: customer.trn,
              phone: formatUaePhone(customer.phone),
              emirate: customer.emirate,
              buildingName: customer.buildingName,
              flatNo: customer.flatNo,
            }}
            items={previewItems}
            payment={payment.method}
            createdByName={createdByName}
          />
          <button
            type="button"
            disabled={isPending || previewItems.length === 0}
            onClick={handleSave}
            className="w-full rounded-xl bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-3.5"
          >
            {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Save & Create Invoice"}
          </button>
        </div>
      )}
    </div>
  );
}
