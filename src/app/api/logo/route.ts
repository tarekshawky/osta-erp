import { NextResponse } from "next/server";
import { getLogoSrc } from "@/lib/settings";

export async function GET() {
  const src = await getLogoSrc();
  return NextResponse.json({ src });
}
