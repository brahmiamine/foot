import { decodeProtectedHeader, jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import { findVerificationKey, getSigningKey } from "./jwtKeys";

export const SESSION_TTL_SECONDS = 60 * 60 * 12;
const COOKIE_NAME = process.env.SSO_COOKIE_NAME || "foot_sso_session";
const COOKIE_DOMAIN = process.env.SSO_COOKIE_DOMAIN || undefined;

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role:
    | "ADMIN"
    | "OBSERVATEUR"
    | "SUPERADMIN"
    | "MEMBER"
    | "PLATFORM_SUPERADMIN"
    | "FEDERATION_ADMIN"
    | "LEAGUE_ADMIN"
    | "REFEREE"
    | "MATCH_OFFICIAL"
    | "REFEREE_OBSERVER"
    | "PLAYER";
  teamId: string | null;
  federationId?: string | null;
  leagueId?: string | null;
  playerId?: string | null;
  tokenVersion: number;
}

export const SSO_JWT_AUDIENCE = "foot-platform";

async function signSession(user: SsoUser): Promise<string> {
  const { privateKey, kid } = await getSigningKey();
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    federationId: user.federationId ?? null,
    leagueId: user.leagueId ?? null,
    playerId: user.playerId ?? null,
    tokenVersion: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject(user.id)
    .setIssuer("foot-sso")
    .setAudience(SSO_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
    .sign(privateKey);
}

export async function verifySessionToken(token: string): Promise<SsoUser | null> {
  try {
    const header = decodeProtectedHeader(token);
    if (header.alg !== "RS256" || !header.kid) return null;
    const publicKey = await findVerificationKey(header.kid);
    if (!publicKey) return null;

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "foot-sso",
    });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }

    const audiences = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud === undefined
        ? []
        : [payload.aud];
    if (!audiences.includes(SSO_JWT_AUDIENCE)) return null;

    const tokenVersion = typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;
    const dataSource = await getDataSource();
    const user = await dataSource.getRepository(User).findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.tokenVersion !== tokenVersion) return null;

    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role as SsoUser["role"],
      teamId: typeof payload.teamId === "string" ? payload.teamId : null,
      federationId: typeof payload.federationId === "string" ? payload.federationId : null,
      leagueId: typeof payload.leagueId === "string" ? payload.leagueId : null,
      playerId: typeof payload.playerId === "string" ? payload.playerId : null,
      tokenVersion: user.tokenVersion,
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
  return issueSessionCookie(response, await signSession(user));
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
