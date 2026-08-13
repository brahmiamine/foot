import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

const REVOCATION_CACHE_TTL_MS = 30_000;
const REVOCATION_FETCH_TIMEOUT_MS = 2_000;

interface RevocationCacheEntry {
  active: boolean;
  expiresAt: number;
}

/**
 * Vérifie le JWT émis par `sso` (RS256 + kid, JWKS, `jose`, issuer
 * `foot-sso` — voir sso/src/lib/session.ts et TASK-P0-001) et les copies en
 * lecture seule `<app>/src/lib/ssoSession.ts`. Le Notification API n'émet
 * jamais de session : il ne fait que vérifier, contre le JWKS publié par
 * `sso` (SSO_URL + /api/.well-known/jwks.json), avec fallback HS256 legacy
 * (SSO_JWT_SECRET) pour les jetons émis juste avant cette migration.
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
  private remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private remoteJwksUrl: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private getLegacySecret(): Uint8Array | null {
    const secret = this.config.get<string>('SSO_JWT_SECRET');
    if (!secret) return null;
    return new TextEncoder().encode(secret);
  }

  private getRemoteJwks(): ReturnType<typeof createRemoteJWKSet> {
    const ssoUrl = this.config.get<string>('SSO_URL');
    if (!ssoUrl) throw new Error('SSO_URL must be set to verify RS256 session tokens (JWKS)');
    const jwksUrl = `${ssoUrl.replace(/\/$/, '')}/api/.well-known/jwks.json`;
    if (!this.remoteJwks || this.remoteJwksUrl !== jwksUrl) {
      this.remoteJwks = createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 5 * 60 * 1000 });
      this.remoteJwksUrl = jwksUrl;
    }
    return this.remoteJwks;
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
      const issuer = this.config.get<string>('SSO_JWT_ISSUER') ?? 'foot-sso';
      const header = decodeProtectedHeader(token);
      let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];
      if (header.alg === 'HS256') {
        const legacySecret = this.getLegacySecret();
        if (!legacySecret) return null;
        ({ payload } = await jwtVerify(token, legacySecret, { issuer }));
      } else {
        ({ payload } = await jwtVerify(token, this.getRemoteJwks(), { issuer }));
      }
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
