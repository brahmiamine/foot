/**
 * Client HTTP vers `matchsheet` (`POST /api/internal/matches/:matchId/reopen`).
 * Authentification par clé de service (`x-api-key`), jamais par une session
 * SSO — superadmin n'a de toute façon pas accès à matchsheet en tant
 * qu'utilisateur (voir matchsheet/src/middleware.ts). Remplace l'écriture
 * directe TypeORM que `reopenMatchAdmin` faisait jusqu'ici dans `ms_sheets`
 * (TS-31, avancement.md) : matchsheet reste seul propriétaire de cette
 * transition, superadmin ne fait plus que la déclencher.
 *
 * Contrairement à `notificationClient.notify()` (best-effort, jamais
 * bloquant), cet appel EST l'opération métier : une erreur ici doit
 * échouer `reopenMatchAdmin`, jamais être avalée.
 */
export async function reopenSheet(matchId: string): Promise<void> {
  const baseUrl = process.env.MATCHSHEET_URL
  const apiKey = process.env.MATCHSHEET_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('MATCHSHEET_URL/MATCHSHEET_SERVICE_API_KEY non configurés : réouverture impossible.')
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/matches/${matchId}/reopen`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = typeof body?.error === 'string' ? body.error : `matchsheet a répondu ${response.status}`
    throw new Error(`Échec de la réouverture de la feuille côté matchsheet : ${message}`)
  }
}
