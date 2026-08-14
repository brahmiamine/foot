import { NextResponse } from "next/server";
import { buildLoginUrlForPath, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

async function handleLogout() {
  const response = NextResponse.redirect(await buildLoginUrlForPath("/"), 303);
  return clearSsoCookie(response);
}

export async function POST() {
  return handleLogout();
}
