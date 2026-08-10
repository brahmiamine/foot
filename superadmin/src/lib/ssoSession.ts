import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Vérification du cookie de session émis par l'app `sso` (voir
 * sso/src/lib/session.ts pour l'émission). Deux points d'entrée, comme
 * l'ancien src/lib/adminAuth.ts : un pour les route handlers (à partir de
 * NextRequest), un pour les Server Components (à partir de next/headers).
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";
  teamId: string | null;
}

const COOKIE_NAME = process.env.SSO_COOKIE_NAME || "foot_sso_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) throw new Error("SSO_JWT_SECRET must be set");
  return new TextEncoder().encode(secret);
}

export async function verifySessionToken(token: string): Promise<SsoUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: "foot-sso" });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role as SsoUser["role"],
      teamId: typeof payload.teamId === "string" ? payload.teamId : null,
    };
  } catch {
    return null;
  }
}

export async function getSsoSessionFromRequest(request: NextRequest): Promise<SsoUser | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSsoSession(): Promise<SsoUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function buildLoginUrl(currentUrl: string): string {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) throw new Error("SSO_URL must be set");
  const loginUrl = new URL("/login", ssoUrl);
  loginUrl.searchParams.set("redirect", currentUrl);
  return loginUrl.toString();
}

export function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(buildLoginUrl(request.url));
}

export function clearSsoCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    domain: process.env.SSO_COOKIE_DOMAIN || undefined,
  });
  return response;
}
