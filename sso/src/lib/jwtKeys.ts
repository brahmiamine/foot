import { createPrivateKey, createPublicKey } from "crypto";
import { exportJWK, importPKCS8, importSPKI, type JWK, type KeyLike } from "jose";

/**
 * TASK-P0-001 : clés RSA (RS256) pour signer/vérifier les JWT de session,
 * en remplacement du secret symétrique HS256 (SSO_JWT_SECRET). Chaque clé
 * porte un `kid` (key id) publié via /api/.well-known/jwks.json, ce qui
 * permet une rotation sans interruption : la clé "current" signe les
 * nouveaux jetons, la clé "previous" (optionnelle) reste acceptée en
 * vérification pendant la période de grâce de rotation (recommandé: 48h,
 * voir docs/jwt-rotation-runbook.md).
 *
 * SSO_JWT_SECRET (HS256, legacy) reste supporté en VÉRIFICATION SEULEMENT,
 * le temps que les jetons émis avant cette migration expirent naturellement
 * (durée de vie max 12h pour une session, 5min pour un jeton MFA pending —
 * donc toujours <48h). Aucun nouveau jeton n'est jamais signé en HS256.
 */

export interface SigningKey {
  privateKey: KeyLike;
  kid: string;
}

export interface VerificationKey {
  publicKey: KeyLike;
  kid: string;
}

function pemFromEnv(varName: string): string | null {
  const raw = process.env[varName];
  if (!raw) return null;
  // Permet de stocker la clé sur une seule ligne dans .env (\n littéraux).
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function derivePublicPem(privatePem: string): string {
  const privateKey = createPrivateKey(privatePem);
  return createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
}

let cachedSigningKey: Promise<SigningKey> | null = null;
let cachedVerificationKeys: Promise<VerificationKey[]> | null = null;

async function loadSigningKey(): Promise<SigningKey> {
  const pem = pemFromEnv("SSO_JWT_PRIVATE_KEY");
  const kid = process.env.SSO_JWT_KID;
  if (!pem || !kid) {
    throw new Error("SSO_JWT_PRIVATE_KEY and SSO_JWT_KID must be set (RSA 2048 PEM PKCS8 + key id)");
  }
  const privateKey = await importPKCS8(pem, "RS256");
  return { privateKey, kid };
}

async function loadVerificationKeys(): Promise<VerificationKey[]> {
  const keys: VerificationKey[] = [];

  const currentPem = pemFromEnv("SSO_JWT_PRIVATE_KEY");
  const currentKid = process.env.SSO_JWT_KID;
  if (currentPem && currentKid) {
    const publicKey = await importSPKI(derivePublicPem(currentPem), "RS256");
    keys.push({ publicKey, kid: currentKid });
  }

  const previousPem = pemFromEnv("SSO_JWT_PRIVATE_KEY_PREVIOUS");
  const previousKid = process.env.SSO_JWT_KID_PREVIOUS;
  if (previousPem && previousKid) {
    const publicKey = await importSPKI(derivePublicPem(previousPem), "RS256");
    keys.push({ publicKey, kid: previousKid });
  }

  return keys;
}

export function getSigningKey(): Promise<SigningKey> {
  if (!cachedSigningKey) cachedSigningKey = loadSigningKey();
  return cachedSigningKey;
}

export function getVerificationKeys(): Promise<VerificationKey[]> {
  if (!cachedVerificationKeys) cachedVerificationKeys = loadVerificationKeys();
  return cachedVerificationKeys;
}

/** Pour les tests : force le rechargement des clés (env vars modifiées). */
export function resetJwtKeyCache(): void {
  cachedSigningKey = null;
  cachedVerificationKeys = null;
}

export async function findVerificationKey(kid: string | undefined): Promise<KeyLike | null> {
  const keys = await getVerificationKeys();
  if (kid) {
    return keys.find((k) => k.kid === kid)?.publicKey ?? null;
  }
  // Pas de kid dans le header (ne devrait pas arriver pour un jeton RS256
  // émis par ce module) : on retombe sur la clé courante.
  return keys[0]?.publicKey ?? null;
}

export function getLegacyHs256Secret(): Uint8Array | null {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function getJwks(): Promise<{ keys: JWK[] }> {
  const keys = await getVerificationKeys();
  const jwks = await Promise.all(
    keys.map(async ({ publicKey, kid }) => {
      const jwk = await exportJWK(publicKey);
      return { ...jwk, kid, use: "sig", alg: "RS256" };
    })
  );
  return { keys: jwks };
}
