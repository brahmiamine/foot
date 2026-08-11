import { NextResponse } from "next/server";
import { buildLoginUrlForPath, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.redirect(await buildLoginUrlForPath("/admin"));
  return clearSsoCookie(response);
}
