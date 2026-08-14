import { NextRequest, NextResponse } from "next/server";
import { buildSsoRedirectUrl, clearSsoCookie } from "../../../../../packages/auth-shared/src/session";

function logoutResponse(request: NextRequest) {
  const appHome = request.nextUrl.origin;
  const response = NextResponse.redirect(buildSsoRedirectUrl(appHome, "/login"), 303);
  return clearSsoCookie(response);
}

export function GET(request: NextRequest) {
  return logoutResponse(request);
}

export function POST(request: NextRequest) {
  return logoutResponse(request);
}
