import { SignJWT, jwtVerify, decodeProtectedHeader } from "jose";

/**
 * Jeton signé encodé dans le QR code d'un abonnement — même mécanique que
 * src/lib/ticketQr.ts (HS256 via `jose`, mêmes clés TICKET_QR_SECRET_<KID> /
 * TICKET_QR_KID : même app, même frontière de confiance, pas besoin d'un
 * second secret). Seule différence : la charge utile porte `subscriptionId`
 * au lieu de `ticketId`, ce qui suffit à distinguer un jeton d'abonnement
 * d'un jeton de billet sans avoir besoin d'un champ `type` dédié — voir
 * src/lib/payments.ts pour le même principe côté paiement.
 *
 * TTL très long (voir ticketQr.ts pour la justification) : la fraîcheur
 * réelle (statut payé, fenêtre de validité, déjà validé aujourd'hui) est
 * toujours relue en base à chaque scan (scanSubscription), jamais déduite
 * du jeton.
 */
const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

function loadKeyMap(): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>();
  const prefix = "TICKET_QR_SECRET_";
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith(prefix) && value) {
      map.set(name.slice(prefix.length), new TextEncoder().encode(value));
    }
  }
  return map;
}

function getLegacySecret(): Uint8Array | null {
  const secret = process.env.TICKET_QR_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

function getSigningKey(): { kid: string | null; secret: Uint8Array } {
  const kid = process.env.TICKET_QR_KID;
  if (kid) {
    const keyMap = loadKeyMap();
    const secret = keyMap.get(kid);
    if (!secret) {
      throw new Error(`TICKET_QR_SECRET_${kid} doit être configuré (TICKET_QR_KID=${kid}).`);
    }
    return { kid, secret };
  }
  const legacy = getLegacySecret();
  if (!legacy) {
    throw new Error("TICKET_QR_SECRET (ou TICKET_QR_KID + TICKET_QR_SECRET_<KID>) doit être configuré.");
  }
  return { kid: null, secret: legacy };
}

function findVerificationKey(kid: string | undefined): Uint8Array | null {
  if (!kid) {
    return getLegacySecret();
  }
  const keyMap = loadKeyMap();
  return keyMap.get(kid) ?? null;
}

export async function signSubscriptionToken(subscriptionId: string): Promise<string> {
  const { kid, secret } = getSigningKey();
  const header: { alg: "HS256"; kid?: string } = { alg: "HS256" };
  if (kid) {
    header.kid = kid;
  }
  return new SignJWT({ subscriptionId })
    .setProtectedHeader(header)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(secret);
}

export async function verifySubscriptionToken(token: string): Promise<string | null> {
  try {
    const { kid } = decodeProtectedHeader(token);
    const secret = findVerificationKey(kid);
    if (!secret) {
      return null;
    }
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.subscriptionId === "string" ? payload.subscriptionId : null;
  } catch {
    return null;
  }
}
