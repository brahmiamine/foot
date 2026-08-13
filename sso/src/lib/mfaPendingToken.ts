import { decodeProtectedHeader, jwtVerify, SignJWT, type KeyLike } from "jose";
import { findVerificationKey, getLegacyHs256Secret, getSigningKey } from "./jwtKeys";

/**
 * Jeton intermédiaire "mot de passe vérifié, code MFA attendu" — jamais
 * posé en cookie, renvoyé dans le corps de la réponse de /api/login et
 * conservé côté client (état React) le temps de saisir le code. Signé avec
 * un issuer DIFFÉRENT de la session réelle ("foot-sso") pour qu'un jeton
 * volé à cette étape ne puisse jamais être accepté comme une session par
 * verifySessionToken (ici ou dans packages/auth-shared) — jwtVerify rejette
 * tout jeton dont l'issuer ne correspond pas exactement.
 *
 * TASK-P0-001 : RS256 + kid comme session.ts (mêmes clés). Fallback HS256
 * legacy en vérification uniquement, pour les jetons émis juste avant la
 * migration (durée de vie 5min, donc fenêtre de transition très courte).
 */

const PENDING_TTL_SECONDS = 5 * 60; // 5 minutes
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
    let key: KeyLike | Uint8Array;
    if (header.alg === "RS256") {
      const publicKey = await findVerificationKey(header.kid);
      if (!publicKey) return null;
      key = publicKey;
    } else if (header.alg === "HS256") {
      const legacySecret = getLegacyHs256Secret();
      if (!legacySecret) return null;
      key = legacySecret;
    } else {
      return null;
    }

    const { payload } = await jwtVerify(token, key, { issuer: ISSUER });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
