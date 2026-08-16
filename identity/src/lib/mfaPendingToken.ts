import { decodeProtectedHeader, jwtVerify, SignJWT } from "jose";
import { findVerificationKey, getSigningKey } from "./jwtKeys";

/**
 * Jeton intermédiaire "mot de passe vérifié, code MFA attendu" — jamais
 * posé en cookie, renvoyé dans le corps de la réponse de /api/login et
 * conservé côté client le temps de saisir le code. L'issuer est distinct de
 * celui d'une session SSO réelle afin que ce jeton ne soit jamais accepté
 * comme session.
 *
 * L'émission et la vérification sont RS256 uniquement, avec `kid`, comme les
 * sessions SSO. L'ancien fallback HS256 a été retiré avec la fin de la
 * migration cryptographique de la plateforme.
 */

const PENDING_TTL_SECONDS = 5 * 60;
const ISSUER = "foot-sso-mfa-pending";

export async function signMfaPendingToken(userId: string): Promise<string> {
  const { privateKey, kid } = await getSigningKey();
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + PENDING_TTL_SECONDS)
    .sign(privateKey);
}

export async function verifyMfaPendingToken(token: string): Promise<string | null> {
  try {
    const header = decodeProtectedHeader(token);
    if (header.alg !== "RS256" || !header.kid) return null;

    const publicKey = await findVerificationKey(header.kid);
    if (!publicKey) return null;

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: ISSUER,
      algorithms: ["RS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
