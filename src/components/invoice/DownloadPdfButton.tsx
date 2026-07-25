"use client";

import { useRef, useState } from "react";

const CAPTURE_SCALE = 2;
const MARGIN_MM = 8;

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

      // Always lay the content out at full A4 width -- regardless of how wide the
      // source card happened to render on screen (a narrow phone view or a wide
      // admin panel) -- so the exported file always looks like a real A4 sheet.
      // If the content is taller than one page at that width, paginate across
      // multiple A4 pages instead of shrinking everything to fit on one.
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - MARGIN_MM * 2;
      const maxContentHeight = pageHeight - MARGIN_MM * 2;
      const contentHeight = (canvas.height / canvas.width) * contentWidth;

      if (contentHeight <= maxContentHeight) {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", MARGIN_MM, MARGIN_MM, contentWidth, contentHeight);
      } else {
        const pageSliceHeightPx = (maxContentHeight / contentWidth) * canvas.width;
        let renderedPx = 0;
        let isFirstPage = true;

        while (renderedPx < canvas.height) {
          const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - renderedPx);

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeightPx;
          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) break;
          ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

          if (!isFirstPage) pdf.addPage();
          const sliceHeightMm = (sliceHeightPx / canvas.width) * contentWidth;
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", MARGIN_MM, MARGIN_MM, contentWidth, sliceHeightMm);

          renderedPx += sliceHeightPx;
          isFirstPage = false;
        }
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
