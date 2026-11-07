import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { listForCustomer } from "@/lib/contracts/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The signed-in customer's own agreements.
export async function GET(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  return apiSuccess(await listForCustomer(auth.customer.id));
}
