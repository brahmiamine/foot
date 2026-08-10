import { NextRequest, NextResponse } from "next/server";
import { buildLoginUrl, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

function handleLogout(request: NextRequest) {
  const response = NextResponse.redirect(buildLoginUrl(request.nextUrl.origin));
  return clearSsoCookie(response);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
