import { NextResponse } from "next/server";
import { buildStaffLoginUrlForPath, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

async function handleLogout() {
  const response = NextResponse.redirect(await buildStaffLoginUrlForPath("/"), 303);
  return clearSsoCookie(response);
}

export async function POST() {
  return handleLogout();
}
