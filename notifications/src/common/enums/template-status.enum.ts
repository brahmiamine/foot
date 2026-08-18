/** Cycle de vie d'un template (NOTIF-005). Une seule version ACTIVE par (type, channel, locale). */
export enum TemplateStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}
