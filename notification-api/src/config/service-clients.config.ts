import { registerAs } from '@nestjs/config';

export interface ServiceClientsConfig {
  /** Clés actuellement valides — { "application": "clé" }. */
  current: Record<string, string>;
  /**
   * Clé(s) en cours de rotation (TASK-P0-003) : reste acceptée en parallèle
   * de `current` jusqu'à `previousExpiresAt`, pour permettre un déploiement
   * de la nouvelle clé côté applications appelantes sans coupure de
   * service. Vide si aucune rotation n'est en cours.
   */
  previous: Record<string, string>;
  /** ISO 8601 ; passé ce délai, `previous` n'est plus acceptée même si elle est encore présente en env. */
  previousExpiresAt?: string;
}

function parseServiceApiKeys(
  raw: string | undefined,
  varName: string,
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(`${varName} must be a JSON object`);
    }
    return parsed as Record<string, string>;
  } catch (error) {
    throw new Error(
      `Invalid ${varName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Identité des applications backend autorisées à appeler /internal/* (voir
 * §21). SERVICE_API_KEYS est un JSON `{ "application": "clé" }` ; chaque
 * application de l'écosystème possède sa propre clé, jamais partagée. Le
 * ServiceAuthGuard compare la clé reçue (header `x-api-key`) à ce registre et
 * en déduit l'`application` appelante (utilisée pour l'audit/les stats).
 *
 * Rotation sans interruption (TASK-P0-003, portion applicative — pas
 * d'infra Vault/AWS Secrets Manager dans ce repo) : SERVICE_API_KEYS_PREVIOUS
 * (même format) reste acceptée en parallèle jusqu'à
 * SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT. Procédure : générer une nouvelle
 * clé → la mettre dans SERVICE_API_KEYS → déplacer l'ancienne vers
 * SERVICE_API_KEYS_PREVIOUS avec une expiration (ex. +24h) → redéployer les
 * applications appelantes avec la nouvelle clé pendant la fenêtre de grâce
 * → retirer SERVICE_API_KEYS_PREVIOUS une fois la fenêtre passée.
 */
export const serviceClientsConfig = registerAs(
  'serviceClients',
  (): ServiceClientsConfig => ({
    current: parseServiceApiKeys(process.env.SERVICE_API_KEYS, 'SERVICE_API_KEYS'),
    previous: parseServiceApiKeys(
      process.env.SERVICE_API_KEYS_PREVIOUS,
      'SERVICE_API_KEYS_PREVIOUS',
    ),
    previousExpiresAt: process.env.SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT || undefined,
  }),
);
