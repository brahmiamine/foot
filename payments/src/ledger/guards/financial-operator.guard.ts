import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedService } from '../../auth/interfaces/authenticated-service.interface';

const FINANCIAL_OPERATOR_APPLICATIONS = new Set(['federation-hub']);

@Injectable()
export class FinancialOperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const service = (request as Request & { service?: AuthenticatedService })
      .service;
    if (!service || !FINANCIAL_OPERATOR_APPLICATIONS.has(service.application)) {
      throw new ForbiddenException('Financial operator access required');
    }
    return true;
  }
}
