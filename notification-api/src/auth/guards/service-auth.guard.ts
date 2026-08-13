import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthenticatedService } from '../../common/interfaces/authenticated-user.interface';
import type { ServiceClientsConfig } from '../../config/service-clients.config';

/**
 * Authentification service-à-service des endpoints `/internal/*` (§21).
 * Chaque application backend de l'écosystème (teamManager, payment-api, …)
 * possède sa propre clé API, jamais partagée, transmise via le header
 * `x-api-key`. Ne réutilise jamais le JWT utilisateur : une application ne
 * représente pas un utilisateur.
 *
 * TASK-P0-003 : accepte aussi la clé précédente pendant une rotation
 * (voir service-clients.config.ts) et journalise chaque appel authentifié
 * (serviceId, kid, endpoint) — pas de vault, la source de vérité des clés
 * reste l'environnement de ce service.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    const clients = this.config.get<ServiceClientsConfig>('serviceClients') ?? {
      current: {},
      previous: {},
    };

    let application = Object.keys(clients.current).find(
      (name) => clients.current[name] === apiKey,
    );
    let kid: 'current' | 'previous' = 'current';

    if (!application) {
      const stillInGracePeriod =
        !clients.previousExpiresAt ||
        new Date(clients.previousExpiresAt).getTime() > Date.now();
      if (stillInGracePeriod) {
        application = Object.keys(clients.previous).find(
          (name) => clients.previous[name] === apiKey,
        );
        if (application) kid = 'previous';
      }
    }

    if (!application) {
      throw new UnauthorizedException('Invalid service API key');
    }

    console.warn(
      JSON.stringify({
        event: 'service_auth',
        serviceId: application,
        kid,
        endpoint: `${request.method} ${request.path}`,
        timestamp: new Date().toISOString(),
      }),
    );

    (request as unknown as { service: AuthenticatedService }).service = {
      application,
    };
    return true;
  }
}
