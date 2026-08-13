import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

// Hitting the bare /api/v1 (no sub-path) has no handler of its own -- this index
// exists so that lands on a helpful directory instead of Next's generic 404.
export function GET() {
  return apiSuccess({
    name: "OSTA Services ERP - Customer API",
    version: "1.0.0",
    docs: "https://osta-invoices.vercel.app/openapi.yaml",
    endpoints: [
      { method: "POST", path: "/auth/otp/request" },
      { method: "POST", path: "/auth/otp/verify" },
      { method: "GET", path: "/me" },
      { method: "GET", path: "/orders" },
      { method: "POST", path: "/orders" },
      { method: "GET", path: "/orders/:id" },
      { method: "GET", path: "/invoices" },
      { method: "GET", path: "/invoices/:id" },
    ],
  });
}
