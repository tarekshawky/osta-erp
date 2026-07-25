"use client";

import { useRef, useState } from "react";

const PX_TO_MM = 25.4 / 96;
const CAPTURE_SCALE = 2;
const PAGE_MARGIN_MM = 4;

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

      const canvas = await html2canvas(node, { scale: CAPTURE_SCALE, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      // Size the PDF page to the content itself (plus a small margin) instead of
      // forcing it into a fixed A4 sheet -- otherwise viewers that open at "fit
      // width" only show the top of a mostly-blank page, which reads as "zoomed in".
      const contentWidth = (canvas.width / CAPTURE_SCALE) * PX_TO_MM;
      const contentHeight = (canvas.height / CAPTURE_SCALE) * PX_TO_MM;
      const pageWidth = contentWidth + PAGE_MARGIN_MM * 2;
      const pageHeight = contentHeight + PAGE_MARGIN_MM * 2;

      const pdf = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] });
      pdf.addImage(imgData, "PNG", PAGE_MARGIN_MM, PAGE_MARGIN_MM, contentWidth, contentHeight);
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
