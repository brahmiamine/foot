import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthorizeUrl } from "@/lib/google";
import { sanitizeRedirect } from "@/lib/redirect";
import { OAUTH_STATE_COOKIE } from "@/lib/oauthState";

export const runtime = "nodejs";

function getRequestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const redirect = sanitizeRedirect(request.nextUrl.searchParams.get("redirect")) ?? "/";
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getRequestOrigin(request)}/api/auth/google/callback`;

  const response = NextResponse.redirect(buildGoogleAuthorizeUrl(redirectUri, state));
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: encodeURIComponent(JSON.stringify({ state, redirect })),
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/google",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });
  return response;
}
