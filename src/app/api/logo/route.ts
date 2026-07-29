import { NextRequest, NextResponse } from "next/server";
import { getLogoSrc, getCertificateLogoSrc } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const src = type === "certificate" ? await getCertificateLogoSrc() : await getLogoSrc();
  return NextResponse.json({ src });
}
