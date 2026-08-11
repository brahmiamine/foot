import { NextRequest, NextResponse } from "next/server";
import { buildLoginUrl, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

function handleLogout(request: NextRequest) {
  // 303 explicite : la déconnexion répond à un POST, un 307/308 par défaut
  // referait suivre un POST vers la page de destination.
  const response = NextResponse.redirect(buildLoginUrl(request.nextUrl.origin), 303);
  return clearSsoCookie(response);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
