import { randomUUID } from "crypto";

/**
 * Client HTTP vers `match-operations` (`POST /api/internal/matches/:matchId/reopen`).
 * Authentification par clé de service (`x-api-key`), jamais par une session
 * SSO — federation-hub n'a de toute façon pas accès à match-operations en tant
 * qu'utilisateur (voir match-operations/src/middleware.ts). Remplace l'écriture
 * directe TypeORM que `reopenMatchAdmin` faisait jusqu'ici dans `ms_sheets`
 * (TS-31, avancement.md) : match-operations reste seul propriétaire de cette
 * transition, federation-hub ne fait plus que la déclencher.
 *
 * Contrairement à `notificationClient.notify()` (best-effort, jamais
 * bloquant), cet appel EST l'opération métier : une erreur ici doit
 * échouer `reopenMatchAdmin`, jamais être avalée.
 */

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * TASK-P0-014 : une même `idempotencyKey` (générée une seule fois par appel
 * à `reopenSheet`, réutilisée sur ses propres retries) est envoyée à chaque
 * tentative — si une tentative précédente a en fait réussi côté match-operations
 * mais que sa réponse s'est perdue (timeout, coupure réseau), le retry avec
 * la même clé renvoie 200 sans re-déclencher la transition (voir
 * match-operations/src/services/SheetService.ts#reopen). Ne retente qu'en cas
 * d'échec RÉSEAU (fetch qui jette) — une réponse HTTP reçue (4xx/5xx) est un
 * refus métier explicite de match-operations, jamais rejouée automatiquement.
 */
export async function reopenSheet(matchId: string): Promise<void> {
  const baseUrl = process.env.MATCH_OPERATIONS_URL;
  const apiKey = process.env.MATCH_OPERATIONS_SERVICE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('MATCH_OPERATIONS_URL/MATCH_OPERATIONS_SERVICE_API_KEY non configurés : réouverture impossible.');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/matches/${matchId}/reopen`;
  const idempotencyKey = randomUUID();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Idempotency-Key': idempotencyKey },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      const reason = error instanceof Error ? error.message : 'erreur réseau';
      throw new Error(`Échec de la réouverture de la feuille côté match-operations : ${reason}`);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = typeof body?.error === 'string' ? body.error : `match-operations a répondu ${response.status}`;
      throw new Error(`Échec de la réouverture de la feuille côté match-operations : ${message}`);
    }
    return;
  }
}
