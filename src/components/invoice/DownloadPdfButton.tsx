"use client";

import { useRef, useState } from "react";

const CAPTURE_SCALE = 2;
// JPEG at this quality is visually indistinguishable from the source screenshot for
// a text/line-art document, and the browser's own encoder produces it -- unlike
// jsPDF's built-in PNG "compression" option, which can emit a corrupted/truncated
// image stream for large captures (renders fine in lenient viewers like pdf.js but
// as a black block in stricter ones like macOS Preview or Acrobat).
const JPEG_QUALITY = 0.92;
// Tight margins so the content spans close to the full A4 page width instead of
// leaving large blank borders.
const MARGIN_TOP_MM = 10;
const MARGIN_BOTTOM_MM = 10;
const MARGIN_SIDE_MM = 8;
// The document has a responsive header (logo beside the INVOICE title) that wraps
// onto its own line below a certain width. Capturing the live on-page element would
// make the PDF's layout depend on whatever browser window size happened to be open
// when "Download PDF" was clicked. Instead we clone the node into an offscreen
// container at a fixed, print-safe width so the exported file always looks the same.
const RENDER_WIDTH_PX = 1200;

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

      // Always lay the content out at full A4 width -- regardless of how wide the
      // source card happened to render on screen (a narrow phone view or a wide
      // admin panel) -- so the exported file always looks like a real A4 sheet.
      // If the content is taller than one page at that width, paginate across
      // multiple A4 pages instead of shrinking everything to fit on one.
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - MARGIN_SIDE_MM * 2;
      const maxContentHeight = pageHeight - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;

      const offscreen = document.createElement("div");
      offscreen.style.position = "fixed";
      offscreen.style.top = "0";
      offscreen.style.left = "-99999px";
      offscreen.style.width = `${RENDER_WIDTH_PX}px`;
      const clone = node.cloneNode(true) as HTMLElement;
      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      // If the card's own content is shorter than a full page, stretch the spacer
      // just above its footer so the footer ends up flush with the page's bottom
      // margin instead of leaving a blank white gap below a short document. This is
      // done by measuring and setting an explicit pixel height on a marked spacer
      // element, rather than a CSS flex-grow spacer: html2canvas doesn't reliably
      // resolve flex-grow distribution, so a flex-based spacer silently collapses
      // back to zero height in the captured image.
      const onePageHeightPx = (maxContentHeight / contentWidth) * RENDER_WIDTH_PX;
      const naturalHeightPx = clone.getBoundingClientRect().height;
      if (naturalHeightPx < onePageHeightPx) {
        const spacer = clone.querySelector<HTMLElement>("[data-pdf-spacer]");
        if (spacer) spacer.style.height = `${onePageHeightPx - naturalHeightPx}px`;
      }

      let canvas;
      try {
        canvas = await html2canvas(clone, {
          scale: CAPTURE_SCALE,
          backgroundColor: "#ffffff",
          width: RENDER_WIDTH_PX,
          windowWidth: RENDER_WIDTH_PX,
        });
      } finally {
        offscreen.remove();
      }

      const contentHeight = (canvas.height / canvas.width) * contentWidth;

      if (contentHeight <= maxContentHeight) {
        const imgData = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        pdf.addImage(imgData, "JPEG", MARGIN_SIDE_MM, MARGIN_TOP_MM, contentWidth, contentHeight);
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
          pdf.addImage(
            sliceCanvas.toDataURL("image/jpeg", JPEG_QUALITY),
            "JPEG",
            MARGIN_SIDE_MM,
            MARGIN_TOP_MM,
            contentWidth,
            sliceHeightMm
          );

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
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="inline-block align-middle mr-1.5 -mt-0.5"
      >
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {isGenerating ? "Generating..." : label}
    </button>
  );
}
