/**
 * Applications connues de l'écosystème foot pouvant appeler /internal/*.
 * Liste indicative pour la doc/Swagger et les stats admin : le Notification
 * API n'y ajoute jamais de logique conditionnelle (voir §32) — l'identité de
 * l'appelant sert uniquement au filtrage, à l'audit et à l'authentification
 * service-à-service (voir ServiceAuthGuard / SERVICE_API_KEYS).
 */
export const KNOWN_APPLICATIONS = [
  'identity',
  'club-hub',
  'club-ob',
  'match-operations',
  'referee-center',
  'federation-hub',
  'payments',
  'marketplace',
  'seller-portal',
] as const;

export type KnownApplication = (typeof KNOWN_APPLICATIONS)[number];
