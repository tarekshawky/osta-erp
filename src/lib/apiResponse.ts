import { NextResponse } from "next/server";

// Permissive CORS: this is a bearer-token API (no cookies/session state a
// misconfigured origin could piggyback on), so allowing any origin is safe --
// unlike the admin/employee pages, which stay cookie-session-only and unaffected.
// Needed for browser-based testers/clients (e.g. a hosted API test page) to call
// osta-invoices.vercel.app cross-origin.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function apiSuccess<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }) {
  return NextResponse.json({ data, ...(init?.meta ?? {}) }, { status: init?.status ?? 200, headers: CORS_HEADERS });
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status, headers: CORS_HEADERS });
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
