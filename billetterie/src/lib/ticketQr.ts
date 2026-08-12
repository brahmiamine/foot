import { SignJWT, jwtVerify } from "jose";

/**
 * Jeton signé encodé dans le QR code d'un billet (voir scanTicket dans
 * src/lib/tickets.ts) — HS256 via `jose`, même bibliothèque que
 * packages/auth-shared/src/session.ts pour la session sso. Le jeton ne
 * porte que l'identité du billet (ticketId) : jamais la source de vérité
 * (statut, catégorie...), toujours relue en base au moment du scan pour
 * éviter qu'un jeton capturé longtemps à l'avance reste utilisable après
 * un changement d'état.
 *
 * Expiration longue (1 an) plutôt que liée à la date du match : un même
 * billet doit rester scannable même si le match est décalé après achat, la
 * fraîcheur réelle est garantie par la relecture du statut en base, pas
 * par l'expiration du jeton.
 */
const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.TICKET_QR_SECRET;
  if (!secret) {
    throw new Error("TICKET_QR_SECRET doit être configuré pour signer/vérifier les billets scannables.");
  }
  return new TextEncoder().encode(secret);
}

export async function signTicketToken(ticketId: string): Promise<string> {
  return new SignJWT({ ticketId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(getSecret());
}

export async function verifyTicketToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.ticketId === "string" ? payload.ticketId : null;
  } catch {
    return null;
  }
}
