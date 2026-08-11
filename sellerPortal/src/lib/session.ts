import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Session vendeur — authentification indépendante du SSO club (sso/ n'émet
 * des sessions que pour le staff club). Un cookie httpOnly signé porte
 * sellerUserId + sellerId + role ; c'est la SEULE source de vérité pour
 * savoir "qui est le vendeur connecté" côté API (voir src/lib/authz.ts).
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

const COOKIE_NAME = process.env.SP_COOKIE_NAME || "sp_seller_session";

export interface SellerSessionUser {
  sellerUserId: string;
  sellerId: string;
  // Club dont ce vendeur alimente le marketplace (Seller.clubId au moment
  // de la connexion) — source de vérité pour tout filtrage par club côté
  // API, jamais une valeur envoyée par le frontend.
  clubId: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SP_JWT_SECRET;
  if (!secret) {
    throw new Error("SP_JWT_SECRET must be set");
  }
  return new TextEncoder().encode(secret);
}

async function signSession(user: SellerSessionUser): Promise<string> {
  return new SignJWT({
    sellerId: user.sellerId,
    clubId: user.clubId,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sellerUserId)
    .setIssuer("sellerPortal")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SellerSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: "sellerPortal" });
    if (
      !payload.sub ||
      typeof payload.sellerId !== "string" ||
      typeof payload.clubId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sellerUserId: payload.sub,
      sellerId: payload.sellerId,
      clubId: payload.clubId,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role as SellerSessionUser["role"],
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
  });
  return response;
}

export async function issueSession(response: NextResponse, user: SellerSessionUser) {
  const token = await signSession(user);
  return issueSessionCookie(response, token);
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function getCurrentSellerSession(): Promise<SellerSessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
