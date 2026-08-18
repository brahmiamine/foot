import { createHash } from "node:crypto";

/**
 * Identité publique stable, non réversible à partir de l'UI. Le nom/email SSO
 * ne doivent jamais être copiés automatiquement dans les surfaces publiques.
 */
export function supporterPublicName(userId: string, teamId: string): string {
  const suffix = createHash("sha256")
    .update(`${teamId}:${userId}`, "utf8")
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `Supporter ${suffix}`;
}
