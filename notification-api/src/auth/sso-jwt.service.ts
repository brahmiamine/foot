import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

const REVOCATION_CACHE_TTL_MS = 30_000;
const REVOCATION_FETCH_TIMEOUT_MS = 2_000;

interface RevocationCacheEntry {
  active: boolean;
  expiresAt: number;
}

/**
 * Vérifie le JWT émis par `sso` (HS256, `jose`, issuer `foot-sso`) — voir
 * sso/src/lib/session.ts et les copies en lecture seule
 * `<app>/src/lib/ssoSession.ts`. Le Notification API n'émet jamais de
 * session : il ne fait que vérifier, avec le même secret partagé
 * (SSO_JWT_SECRET). Aucun système d'authentification différent (§4).
 *
 * Si `SSO_URL` est configuré, vérifie aussi la révocation réelle
 * (tokenVersion) auprès de GET /api/session/introspect, avec un cache en
 * mémoire de 30s par jeton — même mécanisme que
 * packages/auth-shared/src/session.ts (verifySsoTokenWithRevocation) côté
 * apps Next.js, voir avancement.md, "Propagation de la révocation de
 * session". Fail-open si `sso` est injoignable ou si `SSO_URL` est absent :
 * on retombe sur signature/expiration seules plutôt que de bloquer les
 * envois de notifications pour un incident réseau transitoire.
 */
@Injectable()
export class SsoJwtService {
  private readonly revocationCache = new Map<string, RevocationCacheEntry>();

  constructor(private readonly config: ConfigService) {}

  private getSecret(): Uint8Array {
    const secret = this.config.get<string>('SSO_JWT_SECRET');
    if (!secret) throw new Error('SSO_JWT_SECRET must be set');
    return new TextEncoder().encode(secret);
  }

  private async isRevoked(token: string): Promise<boolean> {
    const ssoUrl = this.config.get<string>('SSO_URL');
    if (!ssoUrl) return false;

    const now = Date.now();
    const cached = this.revocationCache.get(token);
    if (cached && cached.expiresAt > now) {
      return !cached.active;
    }

    try {
      const res = await fetch(`${ssoUrl.replace(/\/$/, '')}/api/session/introspect`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REVOCATION_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return false;

      const body = (await res.json()) as { active?: boolean };
      const active = body.active === true;
      this.revocationCache.set(token, { active, expiresAt: now + REVOCATION_CACHE_TTL_MS });
      return !active;
    } catch {
      return false;
    }
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

      if (await this.isRevoked(token)) {
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
