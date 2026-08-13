/**
 * Verrou asynchrone en mémoire, par clé, pour sérialiser la validation +
 * l'écriture d'un match touchant une même ressource (équipe, arbitre) —
 * ferme la fenêtre de course entre "aucun conflit détecté" et "match
 * inséré" pour deux requêtes concurrentes portant sur la même équipe/le
 * même arbitre (TASK-P0-008).
 *
 * Limite assumée : ce verrou n'est efficace que pour une seule instance de
 * l'application (pas de coordination inter-process/inter-instance). Une
 * garantie multi-instance nécessiterait un verrou distribué (ex: verrou
 * consultatif MySQL `GET_LOCK`) ou une contrainte d'exclusion en base — hors
 * périmètre de ce correctif, `superadmin` est déployé en instance unique.
 */
const chains = new Map<string, Promise<unknown>>()

export async function withScheduleLock<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
  const uniqueKeys = [...new Set(keys)].sort()

  // Un seul verrou combiné par appel : chaîner sur la queue de chaque clé
  // impliquée garantit qu'aucun autre appel touchant l'une de ces clés ne
  // s'exécute en parallèle, sans risque d'interblocage (ordre des clés
  // toujours trié de façon déterministe).
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })

  const previous = Promise.all(uniqueKeys.map((key) => chains.get(key) ?? Promise.resolve()))
  for (const key of uniqueKeys) {
    chains.set(key, gate)
  }

  await previous
  try {
    return await fn()
  } finally {
    release()
    for (const key of uniqueKeys) {
      if (chains.get(key) === gate) {
        chains.delete(key)
      }
    }
  }
}
