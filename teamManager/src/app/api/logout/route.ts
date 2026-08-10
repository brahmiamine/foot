import { NextResponse } from "next/server";
import { buildLoginUrlForPath, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

async function handleLogout() {
  const response = NextResponse.redirect(await buildLoginUrlForPath("/admin"));
  return clearSsoCookie(response);
}

export async function GET() {
  return handleLogout();
}

export async function POST() {
  return handleLogout();
}
