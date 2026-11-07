import { NextRequest } from "next/server";
import { apiError } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

// Where an online payment gateway will confirm payments. No gateway is connected yet, so nothing is accepted here: a payment is
// recorded only by an authorized admin (Contracts -> Record payment). When a gateway is added, its adapter must verify the gateway's
// signature on this request and then call confirmPayment() in lib/contracts/service.ts -- never trust the payload as it arrives.
export async function POST(_request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  return apiError("not_configured", `No payment gateway is connected (${provider.slice(0, 30)}).`, 501);
}
