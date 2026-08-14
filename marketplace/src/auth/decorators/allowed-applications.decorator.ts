import { SetMetadata } from '@nestjs/common';

export const ALLOWED_APPLICATIONS_KEY = 'allowedApplications';

/**
 * TASK-P0-027 : déclare, sur un contrôleur ou une route protégée par
 * ServiceAuthGuard, quelles applications de l'écosystème ont le droit de
 * l'appeler (par nom, tel que déclaré dans SERVICE_API_KEYS). Voir
 * AllowedApplicationsGuard pour l'application de cette liste.
 */
export const AllowedApplications = (...applications: string[]) =>
  SetMetadata(ALLOWED_APPLICATIONS_KEY, applications);
