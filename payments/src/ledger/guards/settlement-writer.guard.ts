import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedService } from '../../auth/interfaces/authenticated-service.interface';

const SETTLEMENT_WRITER_APPLICATIONS = new Set(['marketplace']);

@Injectable()
export class SettlementWriterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const service = (request as Request & { service?: AuthenticatedService })
      .service;
    if (!service || !SETTLEMENT_WRITER_APPLICATIONS.has(service.application)) {
      throw new ForbiddenException('Settlement writer access required');
    }
    return true;
  }
}
