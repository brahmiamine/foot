import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedService } from '../../auth/interfaces/authenticated-service.interface';

const REFUND_OPERATOR_APPLICATIONS = new Set(['federation-hub']);

/**
 * Autorisation supplémentaire pour la file opérateur globale des
 * remboursements. ServiceAuthGuard authentifie d'abord l'application ; ce
 * guard refuse ensuite toutes les applications métier qui ne doivent gérer
 * que leurs propres paiements.
 */
@Injectable()
export class RefundOperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const service = (request as Request & { service?: AuthenticatedService }).service;

    if (!service || !REFUND_OPERATOR_APPLICATIONS.has(service.application)) {
      throw new ForbiddenException('Refund operator access required');
    }

    return true;
  }
}
