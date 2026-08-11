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
 * payment-api (initiation de paiement, lecture d'un paiement). Chaque
 * application backend de l'écosystème (ob, teamManager, sellerPortal, …)
 * possède sa propre clé API, jamais partagée, transmise via le header
 * `x-api-key`. Ne protège jamais les webhooks providers : ceux-ci sont
 * authentifiés par re-vérification serveur-à-serveur / checksum (Konnect,
 * Paymee, Flouci n'ont pas connaissance de cette clé).
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
