import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

/**
 * Vérifie le JWT émis par `sso` (HS256, `jose`, issuer `foot-sso`) — voir
 * sso/src/lib/session.ts et les copies en lecture seule
 * `<app>/src/lib/ssoSession.ts`. Le Notification API n'émet jamais de
 * session : il ne fait que vérifier, avec le même secret partagé
 * (SSO_JWT_SECRET). Aucun système d'authentification différent (§4).
 */
@Injectable()
export class SsoJwtService {
  constructor(private readonly config: ConfigService) {}

  private getSecret(): Uint8Array {
    const secret = this.config.get<string>('SSO_JWT_SECRET');
    if (!secret) throw new Error('SSO_JWT_SECRET must be set');
    return new TextEncoder().encode(secret);
  }

  async verify(token: string): Promise<AuthenticatedUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.getSecret(), {
        issuer: this.config.get<string>('SSO_JWT_ISSUER') ?? 'foot-sso',
      });
      if (
        !payload.sub ||
        typeof payload.email !== 'string' ||
        typeof payload.role !== 'string'
      ) {
        return null;
      }
      return {
        id: payload.sub,
        email: payload.email,
        name: typeof payload.name === 'string' ? payload.name : payload.email,
        role: payload.role,
        teamId: typeof payload.teamId === 'string' ? payload.teamId : null,
      };
    } catch {
      return null;
    }
  }
}
