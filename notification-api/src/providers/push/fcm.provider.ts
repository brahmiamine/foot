import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { importPKCS8, SignJWT } from 'jose';
import { PushSubscription } from '../../push-subscriptions/entities/push-subscription.entity';
import { PushPlatform } from '../../common/enums/platform.enum';
import {
  InvalidPushSubscriptionError,
  PushMessage,
  PushProvider,
} from './push-provider.interface';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ASSERTION_TTL_SECONDS = 3600;
/** Renouvelée un peu avant l'expiration réelle pour ne jamais envoyer avec un jeton sur le point d'expirer. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Firebase Cloud Messaging (Android/iOS/Web via token FCM) — §16.
 *
 * Authentifié par compte de service (FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY,
 * JWT RS256 signé avec `jose` — déjà une dépendance du projet, voir
 * SsoJwtService — plutôt qu'ajouter `firebase-admin`) : signe une
 * assertion JWT, l'échange contre un jeton d'accès OAuth2 auprès de Google
 * (grant_type urn:ietf:params:oauth:grant-type:jwt-bearer), mis en cache
 * jusqu'à peu avant son expiration, puis appelle l'API HTTP v1
 * (POST /v1/projects/{id}/messages:send). Voir
 * https://firebase.google.com/docs/cloud-messaging/auth-server pour le
 * détail du flux.
 */
@Injectable()
export class FcmProvider implements PushProvider, OnModuleInit {
  readonly name = 'fcm';
  private readonly logger = new Logger(FcmProvider.name);
  private configured = false;
  private cachedToken: CachedAccessToken | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (
      !this.getProjectId() ||
      !this.getClientEmail() ||
      !this.getPrivateKeyPem()
    ) {
      this.logger.warn(
        'FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY not set: FcmProvider is inactive.',
      );
      return;
    }
    this.configured = true;
  }

  private getProjectId(): string | undefined {
    return this.config.get<string>('FCM_PROJECT_ID');
  }

  private getClientEmail(): string | undefined {
    return this.config.get<string>('FCM_CLIENT_EMAIL');
  }

  /** La clé privée PEM est stockée avec des `\n` échappés dans l'env (convention Firebase habituelle). */
  private getPrivateKeyPem(): string | undefined {
    return this.config.get<string>('FCM_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  }

  supports(subscription: PushSubscription): boolean {
    return (
      (subscription.platform === PushPlatform.ANDROID ||
        subscription.platform === PushPlatform.IOS) &&
      !!subscription.token
    );
  }

  async send(
    subscription: PushSubscription,
    message: PushMessage,
  ): Promise<void> {
    if (!this.configured) {
      throw new Error(
        'FcmProvider is not configured (FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY missing)',
      );
    }
    if (!subscription.token) {
      throw new InvalidPushSubscriptionError('Missing FCM token');
    }

    const accessToken = await this.getAccessToken();
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(message.data ?? {})) {
      data[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.getProjectId()}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: subscription.token,
            notification: { title: message.title, body: message.body },
            data,
          },
        }),
      },
    );

    if (res.ok) return;

    const errorBody: unknown = await res.json().catch(() => null);
    const status = (errorBody as { error?: { status?: string } } | null)?.error
      ?.status;
    // Jeton FCM désinstallé/périmé — voir InvalidPushSubscriptionError,
    // même sémantique que WebPushProvider sur un 404/410 web push.
    if (
      res.status === 404 ||
      status === 'UNREGISTERED' ||
      status === 'NOT_FOUND'
    ) {
      throw new InvalidPushSubscriptionError('FCM token no longer registered');
    }
    throw new Error(
      `FCM send failed: ${res.status} ${JSON.stringify(errorBody)}`,
    );
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (
      this.cachedToken &&
      this.cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > now
    ) {
      return this.cachedToken.accessToken;
    }

    const assertion = await this.buildAssertionJwt();
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`FCM OAuth token exchange failed: ${res.status} ${body}`);
    }

    const body = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.cachedToken = {
      accessToken: body.access_token,
      expiresAt: now + body.expires_in * 1000,
    };
    return body.access_token;
  }

  private async buildAssertionJwt(): Promise<string> {
    const clientEmail = this.getClientEmail();
    const privateKeyPem = this.getPrivateKeyPem();
    if (!clientEmail || !privateKeyPem) {
      throw new Error(
        'FcmProvider is not configured (FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY missing)',
      );
    }

    const key = await importPKCS8(privateKeyPem, 'RS256');
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ scope: FCM_SCOPE })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(clientEmail)
      .setSubject(clientEmail)
      .setAudience(OAUTH_TOKEN_URL)
      .setIssuedAt(now)
      .setExpirationTime(now + ASSERTION_TTL_SECONDS)
      .sign(key);
  }
}
