import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * TS-57 : porte le `X-Correlation-Id` de la requête HTTP courante à travers
 * tout le code exécuté pendant son traitement (services, logs), sans avoir
 * à le faire transiter explicitement en paramètre de chaque fonction —
 * AsyncLocalStorage suit le contexte asynchrone Node, y compris à travers
 * des appels imbriqués (queue, DB, HTTP sortant).
 */
const storage = new AsyncLocalStorage<{ correlationId: string }>();

export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return storage.run({ correlationId }, fn);
}

/** `undefined` hors du contexte d'une requête HTTP (ex: job planifié, bootstrap). */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
