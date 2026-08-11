import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const redirect = sanitizeRedirect(request.nextUrl.searchParams.get("redirect")) ?? "/login";
  const response = NextResponse.redirect(new URL(redirect, request.url));
  return clearSessionCookie(response);
}
