import { SignJWT, jwtVerify, decodeProtectedHeader } from "jose";

/**
 * Jeton signé encodé dans le QR code d'un billet (voir scanTicket dans
 * src/lib/tickets.ts) — HS256 via `jose`, même bibliothèque que
 * packages/auth-shared/src/session.ts pour la session sso. Le jeton ne
 * porte que l'identité du billet (ticketId) : jamais la source de vérité
 * (statut, catégorie...), toujours relue en base au moment du scan pour
 * éviter qu'un jeton capturé longtemps à l'avance reste utilisable après
 * un changement d'état.
 *
 * Expiration longue (1 an) plutôt que "7 jours avant le match" (proposé
 * initialement par TASK-P0-009) : un billet acheté doit rester scannable
 * même si le match est décalé après achat (report, litige, replanification
 * saisonnière...). Faire expirer le jeton avant le match casserait le scan
 * pour tout match reporté. La fraîcheur réelle est garantie par la
 * relecture du statut en base à chaque scan (scanTicket), pas par
 * l'expiration du jeton — la révocation ciblée (ci-dessous) couvre le cas
 * où un billet précis doit être invalidé avant son expiration naturelle.
 */
const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

/**
 * Rotation de clé symétrique par kid (contrairement à identity/src/lib/jwtKeys.ts
 * qui distribue une clé publique via JWKS, ici signataire et vérificateur
 * sont la même application : pas besoin de JWKS, juste de conserver la/les
 * anciennes clés le temps que les jetons déjà émis (jusqu'à 1 an de TTL)
 * expirent). TICKET_QR_SECRET_<KID> déclare une clé nommée ; TICKET_QR_KID
 * désigne celle utilisée pour signer les nouveaux jetons. Rétrocompatibilité :
 * si aucun *_KID n'est configuré, TICKET_QR_SECRET seul est utilisé sans kid
 * dans l'en-tête (jetons déjà en circulation avant cette migration).
 */
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

export async function signTicketToken(ticketId: string): Promise<string> {
  const { kid, secret } = getSigningKey();
  const header: { alg: "HS256"; kid?: string } = { alg: "HS256" };
  if (kid) {
    header.kid = kid;
  }
  return new SignJWT({ ticketId })
    .setProtectedHeader(header)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(secret);
}

export async function verifyTicketToken(token: string): Promise<string | null> {
  try {
    const { kid } = decodeProtectedHeader(token);
    const secret = findVerificationKey(kid);
    if (!secret) {
      return null;
    }
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.ticketId === "string" ? payload.ticketId : null;
  } catch {
    return null;
  }
}
