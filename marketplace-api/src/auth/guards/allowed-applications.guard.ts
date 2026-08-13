import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedService } from '../interfaces/authenticated-service.interface';
import { ALLOWED_APPLICATIONS_KEY } from '../decorators/allowed-applications.decorator';

/**
 * TASK-P0-027 : ServiceAuthGuard authentifie n'importe quelle application de
 * l'écosystème possédant une clé de service valide — il ne restreint pas
 * QUELLE application est légitime pour un endpoint donné. Ce garde
 * complémentaire vérifie que l'application authentifiée fait partie de la
 * liste explicite déclarée via @AllowedApplications(...) sur la route (ex:
 * modération produits/vendeurs et déclenchement de payouts réservés à
 * teamManager/superadmin, jamais sellerPortal — un vendeur ne doit jamais
 * pouvoir s'auto-approuver ou s'auto-déclencher un virement, même si
 * sellerPortal possède sa propre clé de service pour d'autres usages, ex.
 * self-service `/sellers/me`).
 *
 * Toujours utilisé APRÈS ServiceAuthGuard dans la chaîne de guards (qui
 * peuple `request.service`) : `@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)`.
 * Sans décorateur `@AllowedApplications(...)` sur la route, ce garde laisse
 * passer (comportement historique inchangé) — il ne fait que restreindre
 * les routes qui déclarent explicitement une liste.
 */
@Injectable()
export class AllowedApplicationsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<string[] | undefined>(
      ALLOWED_APPLICATIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowed || allowed.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { service?: AuthenticatedService }>();
    const application = request.service?.application;
    if (!application || !allowed.includes(application)) {
      throw new ForbiddenException(
        'This application is not allowed to call this endpoint',
      );
    }
    return true;
  }
}
