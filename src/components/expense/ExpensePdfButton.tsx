"use client";

import { useState } from "react";
import { COMPANY_INFO } from "@/lib/invoiceData";
import { formatAed, formatDate } from "@/lib/format";

export type ExpensePdfData = {
  id: string;
  date: Date;
  category: string | null;
  vehicle: string | null;
  subcategory: string | null;
  description: string;
  payment: string;
  amount: number;
  status: string;
  refundedAmount: number;
  createdByName: string;
};

export function ExpensePdfButton({ expense, className }: { expense: ExpensePdfData; className?: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleDownload() {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a5" });
      const marginX = 40;
      let y = 50;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text("OSTA", marginX, y);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("SERVICES", marginX, y + 14);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("EXPENSE RECEIPT", 300, y - 6, { align: "right" });

      y += 34;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(COMPANY_INFO.name, marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      y += 12;
      doc.text(COMPANY_INFO.email, marginX, y);
      y += 12;
      doc.text(`TRN: ${COMPANY_INFO.trn}`, marginX, y);
      y += 12;
      doc.text(`License: ${COMPANY_INFO.license}`, marginX, y);
      y += 12;
      doc.text(COMPANY_INFO.website, marginX, y);

      y += 20;
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y, 300, y);
      y += 24;

      const rows: [string, string][] = [
        ["Date", formatDate(expense.date)],
        ["Category", expense.category ?? "—"],
        ...(expense.vehicle ? ([["Vehicle", expense.vehicle]] as [string, string][]) : []),
        ...(expense.subcategory ? ([["Type", expense.subcategory]] as [string, string][]) : []),
        ["Description", expense.description],
        ["Payment Method", expense.payment],
        ["Recorded By", expense.createdByName],
        ["Status", expense.status],
      ];
      if (expense.refundedAmount > 0) {
        rows.push(["Refunded", formatAed(expense.refundedAmount)]);
      }

      doc.setFontSize(10);
      for (const [label, value] of rows) {
        doc.setTextColor(100, 116, 139);
        doc.text(label, marginX, y);
        doc.setTextColor(15, 23, 42);
        doc.text(value, 300, y, { align: "right" });
        y += 20;
      }

      y += 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y, 300, y);
      y += 24;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Amount", marginX, y);
      doc.setTextColor(29, 78, 216);
      doc.text(formatAed(expense.amount), 300, y, { align: "right" });

      doc.save(`Expense-${expense.id.slice(0, 8)}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button type="button" onClick={handleDownload} disabled={isGenerating} className={className} title="Download PDF">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
