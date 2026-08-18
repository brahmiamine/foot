/**
 * Mode d'un canal dans une NotificationPolicy organisationnelle (NOTIF-001).
 * MANDATORY : canal toujours inclus, la préférence utilisateur est ignorée.
 * DEFAULT   : inclusion pilotée par NotificationPreference (comportement historique).
 * DISABLED  : canal jamais utilisé pour cette catégorie, quelle que soit la préférence.
 */
export enum ChannelPolicyMode {
  MANDATORY = 'MANDATORY',
  DEFAULT = 'DEFAULT',
  DISABLED = 'DISABLED',
}
