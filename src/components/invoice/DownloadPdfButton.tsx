"use client";

import { useRef, useState } from "react";

export function DownloadPdfButton({
  targetId,
  fileName,
  className,
  label = "PDF",
  orientation = "portrait",
}: {
  targetId: string;
  fileName: string;
  className?: string;
  label?: string;
  orientation?: "portrait" | "landscape";
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

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const canvasAspect = canvas.width / canvas.height;

      let renderWidth = maxWidth;
      let renderHeight = renderWidth / canvasAspect;
      if (renderHeight > maxHeight) {
        renderHeight = maxHeight;
        renderWidth = renderHeight * canvasAspect;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, renderWidth, renderHeight);
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
