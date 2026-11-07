import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/apiResponse";

// A PDF answer: never cached, never indexed, and downloadable from the website's own address.
export function pdfResponse(bytes: Buffer, filename: string, inline = false) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Expose-Headers": "Content-Disposition",
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
