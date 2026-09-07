import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Server Components can't read the current request's pathname directly --
// this forwards it as a header so src/app/admin/layout.tsx can resolve which
// dashboard section is being requested and enforce Employee.adminSections
// (see src/lib/adminSections.ts) without a per-page guard in every admin
// route.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin/:path*"],
};
