import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Chiffrement réversible du token QR d'un billet (AES-256-GCM). Le token
 * brut n'est jamais stocké en clair (voir cms_tickets.token_encrypted) :
 * une fuite de la base seule ne suffit pas à le reconstituer, il faut aussi
 * le secret serveur. Contrairement à `token_hash` (usage vérification côté
 * teamManager), ceci permet à `ob` de ré-afficher le QR/PDF d'un billet
 * déjà émis (page "Mes billets") sans le régénérer — un billet déjà
 * téléchargé/imprimé reste valide.
 */
function getKey(): Buffer {
  const secret = process.env.TICKET_TOKEN_SECRET || process.env.SSO_JWT_SECRET;
  if (!secret) throw new Error("TICKET_TOKEN_SECRET (ou SSO_JWT_SECRET) doit être défini");
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptToken(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
