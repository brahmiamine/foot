import { SignJWT, jwtVerify } from "jose";

/**
 * Jeton intermédiaire "mot de passe vérifié, code MFA attendu" — jamais
 * posé en cookie, renvoyé dans le corps de la réponse de /api/login et
 * conservé côté client (état React) le temps de saisir le code. Signé avec
 * un issuer DIFFÉRENT de la session réelle ("foot-sso") pour qu'un jeton
 * volé à cette étape ne puisse jamais être accepté comme une session par
 * verifySessionToken (ici ou dans packages/auth-shared) — jwtVerify rejette
 * tout jeton dont l'issuer ne correspond pas exactement.
 */

const PENDING_TTL_SECONDS = 5 * 60; // 5 minutes
const ISSUER = "foot-sso-mfa-pending";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) throw new Error("SSO_JWT_SECRET must be set");
  return new TextEncoder().encode(secret);
}

export async function signMfaPendingToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + PENDING_TTL_SECONDS)
    .sign(getJwtSecret());
}

export async function verifyMfaPendingToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: ISSUER });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
