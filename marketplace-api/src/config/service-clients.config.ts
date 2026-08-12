import { registerAs } from '@nestjs/config';

/**
 * Identité des applications backend autorisées à appeler les endpoints
 * internes de marketplace-api (modération club, gestion des catégories,
 * lecture cross-vendeur). SERVICE_API_KEYS est un JSON
 * `{ "application": "clé" }` ; chaque application de l'écosystème possède sa
 * propre clé, jamais partagée. Le ServiceAuthGuard compare la clé reçue
 * (header `x-api-key`) à ce registre et en déduit l'`application` appelante.
 */
export const serviceClientsConfig = registerAs(
  'serviceClients',
  (): Record<string, string> => {
    const raw = process.env.SERVICE_API_KEYS;
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error('SERVICE_API_KEYS must be a JSON object');
      }
      return parsed as Record<string, string>;
    } catch (error) {
      throw new Error(
        `Invalid SERVICE_API_KEYS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);
