import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthenticatedService } from '../interfaces/authenticated-service.interface';
import type { ServiceClientsConfig } from '../../config/service-clients.config';

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
      const previousExpiresAt = clients.previousExpiresAt
        ? Date.parse(clients.previousExpiresAt)
        : Number.NaN;
      const stillInGracePeriod =
        Number.isFinite(previousExpiresAt) && previousExpiresAt > Date.now();
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
