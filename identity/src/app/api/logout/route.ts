import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";

export const runtime = "nodejs";

function handleLogout(request: NextRequest) {
  const redirect = sanitizeRedirect(request.nextUrl.searchParams.get("redirect")) ?? "/login";
  // 303 explicite : la déconnexion répond à un POST, un 307/308 par défaut
  // referait suivre un POST vers la page de destination.
  const response = NextResponse.redirect(new URL(redirect, request.url), 303);
  return clearSessionCookie(response);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
