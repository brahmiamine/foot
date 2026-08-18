import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedService } from '../../auth/interfaces/authenticated-service.interface';

const RECONCILIATION_OPERATOR_APPLICATIONS = new Set(['federation-hub']);

@Injectable()
export class PaymentReconciliationOperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const service = (request as Request & { service?: AuthenticatedService })
      .service;
    if (
      !service ||
      !RECONCILIATION_OPERATOR_APPLICATIONS.has(service.application)
    ) {
      throw new ForbiddenException(
        'Payment reconciliation operator access required',
      );
    }
    return true;
  }
}
