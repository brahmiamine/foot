import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithCorrelationId } from './correlation-context';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * TS-57 : reprend le `X-Correlation-Id` du client (propagé par un appelant
 * amont, ex: `OB → marketplace-api → payment-api → notification-api`) ou
 * en génère un nouveau si absent (première requête de la chaîne). Renvoyé
 * dans la réponse pour que l'appelant puisse le corréler à son tour.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(CORRELATION_ID_HEADER);
    const correlationId =
      incoming && incoming.trim() ? incoming.trim() : randomUUID();

    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    runWithCorrelationId(correlationId, next);
  }
}
