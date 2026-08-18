/**
 * Copie locale de `packages/domain-contracts/src/configuration-audit.ts`
 * (GOV-005). Voir le commentaire en tête de `./policy.ts` pour la raison
 * (paquet ESM pur incompatible avec le runtime CommonJS de ce service).
 */

export interface ConfigurationAuditContext {
  actorUserId: string;
  actorRole: string;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ConfigurationAuditEntry<
  T extends object,
> extends ConfigurationAuditContext {
  domain: string;
  configurationKey: string;
  scopeType: string;
  scopeId?: string | null;
  previousVersion: number | null;
  newVersion: number;
  before: T | null;
  after: T;
  createdAt: Date;
}

export function requireConfigurationChangeReason(reason: string): string {
  const normalized = reason.trim();
  if (normalized.length < 3) {
    throw new Error('Un motif de changement de configuration est obligatoire');
  }
  if (normalized.length > 1000) {
    throw new Error('Le motif de changement de configuration est trop long');
  }
  return normalized;
}
