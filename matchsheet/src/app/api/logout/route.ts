import { NextRequest, NextResponse } from "next/server";
import { buildLoginUrl, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(buildLoginUrl(request.nextUrl.origin));
  return clearSsoCookie(response);
}
