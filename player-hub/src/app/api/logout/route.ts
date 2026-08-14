import { NextResponse } from "next/server";
import { buildPlayerLoginUrlForPath, clearSsoCookie } from "@/lib/ssoSession";

export const runtime = "nodejs";

async function handleLogout() {
  // 303 explicite : la déconnexion répond à un POST, un 307/308 par défaut
  // referait suivre un POST vers la page de destination.
  const response = NextResponse.redirect(await buildPlayerLoginUrlForPath("/"), 303);
  return clearSsoCookie(response);
}

export async function POST() {
  return handleLogout();
}
