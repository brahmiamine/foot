import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthenticatedService } from '../interfaces/authenticated-service.interface';

/**
 * Authentification service-à-service des endpoints internes de
 * marketplace-api (modération club, gestion des catégories, lecture
 * cross-vendeur). Chaque application backend de l'écosystème (teamManager,
 * superadmin, …) possède sa propre clé API, jamais partagée, transmise via
 * le header `x-api-key`. Ne protège jamais les endpoints publics du
 * catalogue ni les endpoints self-service vendeur (voir SellerJwtGuard).
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
