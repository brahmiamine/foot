/**
 * Message d'erreur sûr à renvoyer au client dans une réponse d'API.
 * Le détail réel (message d'exception, erreur SQL/driver, etc.) peut révéler
 * des informations internes : il n'est donc exposé qu'en développement.
 * En production, seul le message de repli générique est renvoyé.
 */
export function safeErrorMessage(error: unknown, fallback = 'Erreur serveur'): string {
  if (process.env.NODE_ENV === 'production') {
    return fallback
  }
  return error instanceof Error ? error.message : String(error)
}
