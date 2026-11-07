import { NextRequest } from "next/server";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { AGREEMENT_CHECKS, COMPANY } from "@/lib/contracts/clauses";
import { activeTerms } from "@/lib/contracts/terms";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The agreement text the customer reads before confirming (the terms in force for this package page) and the five statements to accept.
export async function GET(request: NextRequest) {
  const group = (request.nextUrl.searchParams.get("group") ?? "").toLowerCase();
  const terms = await activeTerms(/^[a-z0-9-]{0,40}$/.test(group) ? group : "").catch(() => null);
  const company = { name: COMPANY.name, website: COMPANY.website, phone: COMPANY.phone };
  return apiSuccess({ version: terms?.version ?? 0, clauses: terms?.clauses ?? [], checks: AGREEMENT_CHECKS, company, durationMonths: COMPANY.durationMonths });
}
