import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;

  return apiSuccess({
    id: customer.id,
    code: customer.code,
    type: customer.type,
    name: customer.name,
    companyName: customer.companyName,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    email: customer.email,
    language: customer.language,
    emirate: customer.emirate,
    city: customer.city,
    area: customer.area,
    buildingName: customer.buildingName,
    flatNo: customer.flatNo,
    address: customer.address,
  });
}
