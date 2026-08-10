import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";

export const runtime = "nodejs";

function handleLogout(request: NextRequest) {
  const redirect = sanitizeRedirect(request.nextUrl.searchParams.get("redirect")) ?? "/login";
  const response = NextResponse.redirect(new URL(redirect, request.url));
  return clearSessionCookie(response);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
