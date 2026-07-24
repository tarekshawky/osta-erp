"use client";

import { useRef, useState } from "react";

export function DownloadPdfButton({
  targetId,
  fileName,
  className,
  label = "PDF",
}: {
  targetId: string;
  fileName: string;
  className?: string;
  label?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const ranOnce = useRef(false);

  async function handleDownload() {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const node = document.getElementById(targetId);
      if (!node) return;

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${fileName}.pdf`);
      ranOnce.current = true;
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button type="button" onClick={handleDownload} disabled={isGenerating} className={className}>
      {isGenerating ? "Generating..." : label}
    </button>
  );
}
