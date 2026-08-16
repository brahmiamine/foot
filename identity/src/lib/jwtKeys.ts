import { createPrivateKey, createPublicKey } from "crypto";
import { exportJWK, importPKCS8, importSPKI, type JWK, type KeyLike } from "jose";

/** RSA/JWKS key management for SSO session tokens. */
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

export function resetJwtKeyCache(): void {
  cachedSigningKey = null;
  cachedVerificationKeys = null;
}

export async function findVerificationKey(kid: string | undefined): Promise<KeyLike | null> {
  if (!kid) return null;
  const keys = await getVerificationKeys();
  return keys.find((key) => key.kid === kid)?.publicKey ?? null;
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
