import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthenticatedService } from '../../common/interfaces/authenticated-user.interface';

/**
 * Authentification service-à-service des endpoints `/internal/*` (§21).
 * Chaque application backend de l'écosystème (teamManager, payment-api, …)
 * possède sa propre clé API, jamais partagée, transmise via le header
 * `x-api-key`. Ne réutilise jamais le JWT utilisateur : une application ne
 * représente pas un utilisateur.
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

    const clients =
      this.config.get<Record<string, string>>('serviceClients') ?? {};
    const application = Object.keys(clients).find(
      (name) => clients[name] === apiKey,
    );
    if (!application) {
      throw new UnauthorizedException('Invalid service API key');
    }

    (request as unknown as { service: AuthenticatedService }).service = {
      application,
    };
    return true;
  }
}
