import { decodeProtectedHeader, jwtVerify, SignJWT } from "jose";
import { findVerificationKey, getSigningKey } from "./jwtKeys";

/**
 * Jeton intermédiaire "mot de passe vérifié, MFA attendue" — jamais posé en
 * cookie. `purpose` sépare strictement une vérification MFA existante d'un
 * enrôlement imposé par policy ; un endpoint doit demander le purpose exact.
 */
const PENDING_TTL_SECONDS = 5 * 60;
const ISSUER = "foot-sso-mfa-pending";
export type MfaPendingPurpose = "VERIFY" | "ENROLL";

export interface MfaPendingClaims {
  userId: string;
  purpose: MfaPendingPurpose;
}

export async function signMfaPendingToken(
  userId: string,
  purpose: MfaPendingPurpose = "VERIFY",
): Promise<string> {
  const { privateKey, kid } = await getSigningKey();
  return new SignJWT({ purpose })
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + PENDING_TTL_SECONDS)
    .sign(privateKey);
}

export async function verifyMfaPendingClaims(token: string): Promise<MfaPendingClaims | null> {
  try {
    const header = decodeProtectedHeader(token);
    if (header.alg !== "RS256" || !header.kid) return null;
    const publicKey = await findVerificationKey(header.kid);
    if (!publicKey) return null;

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: ISSUER,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string") return null;
    if (payload.purpose !== "VERIFY" && payload.purpose !== "ENROLL") return null;
    return { userId: payload.sub, purpose: payload.purpose };
  } catch {
    return null;
  }
}

/** Backward-compatible helper for the existing MFA verification flow. */
export async function verifyMfaPendingToken(token: string): Promise<string | null> {
  const claims = await verifyMfaPendingClaims(token);
  return claims?.purpose === "VERIFY" ? claims.userId : null;
}
