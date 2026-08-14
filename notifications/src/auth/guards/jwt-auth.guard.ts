import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SsoJwtService } from '../sso-jwt.service';

/**
 * Authentifie les endpoints `/api/*` avec le JWT `sso` : header
 * `Authorization: Bearer <token>` (apps SPA/mobile) ou cookie partagé
 * `foot_sso_session` (frontends server-rendered same-site) — voir §4.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly ssoJwt: SsoJwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const user = await this.ssoJwt.verify(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as unknown as { user: AuthenticatedUser }).user = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim();
    }
    const cookieName =
      this.config.get<string>('SSO_COOKIE_NAME') || 'foot_sso_session';
    const cookieToken = (
      request as unknown as { cookies?: Record<string, string> }
    ).cookies?.[cookieName];
    return cookieToken ?? null;
  }
}
