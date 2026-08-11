import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Émission et vérification du cookie de session partagé entre les 6 apps
 * (matchsheet, arbinote, superadmin, teamManager, ob, sso). Le SSO est le
 * seul endroit qui signe ; les 5 autres apps ne font que vérifier (voir leur
 * propre src/lib/ssoSession.ts, copie en lecture seule de la partie
 * vérification de ce fichier).
 *
 * Cookie posé avec `Domain=SSO_COOKIE_DOMAIN` (ex: ".foot.tn") pour être
 * visible par tous les sous-domaines. En local (SSO_COOKIE_DOMAIN vide), un
 * cookie sans attribut Domain est de toute façon partagé entre les ports
 * d'un même hostname ("localhost"), ce qui permet de tester sans DNS réel.
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

const COOKIE_NAME = process.env.SSO_COOKIE_NAME || "foot_sso_session";
const COOKIE_DOMAIN = process.env.SSO_COOKIE_DOMAIN || undefined;

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "MEMBER";
  teamId: string | null;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) {
    throw new Error("SSO_JWT_SECRET must be set");
  }
  return new TextEncoder().encode(secret);
}

async function signSession(user: SsoUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("foot-sso")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
    .sign(getJwtSecret());
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

export function issueSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    domain: COOKIE_DOMAIN,
  });
  return response;
}

export async function issueSession(response: NextResponse, user: SsoUser) {
  const token = await signSession(user);
  return issueSessionCookie(response, token);
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    domain: COOKIE_DOMAIN,
  });
  return response;
}

export async function getCurrentSession(): Promise<SsoUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
