/**
 * Types de notification que l'utilisateur ne peut jamais désactiver, quel que
 * soit le canal (voir cahier des charges §12). Vérifié par PreferencesService
 * avant toute résolution de préférence : un type listé ici est toujours
 * envoyé sur tous les canaux par défaut de son application (voir
 * NotificationTemplate / canaux applicables), indépendamment des lignes
 * NotificationPreference de l'utilisateur.
 *
 * Liste ouverte : une application peut y ajouter ses propres types critiques
 * sans toucher au reste de l'architecture (voir MANDATORY_TYPES_EXTRA).
 */
export const MANDATORY_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'TICKET_ISSUED',
  'SECURITY_ALERT',
  'ACCOUNT_SUSPENDED',
  'PASSWORD_RESET',
]);

export function isMandatoryNotificationType(type: string): boolean {
  return MANDATORY_NOTIFICATION_TYPES.has(type);
}
