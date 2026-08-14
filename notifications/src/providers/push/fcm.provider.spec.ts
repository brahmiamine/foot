import { generateKeyPairSync } from 'node:crypto';
import { jwtVerify, importSPKI } from 'jose';
import { ConfigService } from '@nestjs/config';
import { PushPlatform } from '../../common/enums/platform.enum';
import { PushSubscription } from '../../push-subscriptions/entities/push-subscription.entity';
import { InvalidPushSubscriptionError } from './push-provider.interface';
import { FcmProvider } from './fcm.provider';

let privateKeyPem: string;
let publicKeyPem: string;

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  privateKeyPem = privateKey;
  publicKeyPem = publicKey;
});

function subscription(
  overrides: Partial<PushSubscription> = {},
): PushSubscription {
  return {
    id: 'sub-1',
    userId: 'user-1',
    deviceId: 'device-1',
    platform: PushPlatform.ANDROID,
    token: 'fcm-token-abc',
    endpoint: null,
    p256dh: null,
    auth: null,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function configService(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const values: Record<string, string | undefined> = {
    FCM_PROJECT_ID: 'foot-tn',
    FCM_CLIENT_EMAIL: 'fcm@foot-tn.iam.gserviceaccount.com',
    // Convention Firebase habituelle : \n échappés dans la variable d'env.
    FCM_PRIVATE_KEY: privateKeyPem.replace(/\n/g, '\\n'),
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

type FetchCall = [string, { body?: string; headers?: Record<string, string> }];

function mockOAuthAndSendResponses(
  fetchMock: jest.Mock,
  sendResponse: { ok: boolean; status?: number; body?: unknown },
) {
  fetchMock.mockImplementationOnce(
    () =>
      new Response(
        JSON.stringify({ access_token: 'access-token-xyz', expires_in: 3600 }),
        { status: 200 },
      ),
  );
  fetchMock.mockImplementationOnce(
    () =>
      new Response(JSON.stringify(sendResponse.body ?? {}), {
        status: sendResponse.status ?? (sendResponse.ok ? 200 : 500),
      }),
  );
}

describe('FcmProvider', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('supports', () => {
    it('accepte ANDROID/IOS avec un token', () => {
      const provider = new FcmProvider(configService());
      expect(
        provider.supports(subscription({ platform: PushPlatform.ANDROID })),
      ).toBe(true);
      expect(
        provider.supports(subscription({ platform: PushPlatform.IOS })),
      ).toBe(true);
    });

    it('refuse WEB ou un abonnement sans token', () => {
      const provider = new FcmProvider(configService());
      expect(
        provider.supports(subscription({ platform: PushPlatform.WEB })),
      ).toBe(false);
      expect(provider.supports(subscription({ token: null }))).toBe(false);
    });
  });

  describe('send', () => {
    it("lève une erreur explicite si le provider n'est pas configuré", async () => {
      const provider = new FcmProvider(
        configService({ FCM_PROJECT_ID: undefined }),
      );
      provider.onModuleInit();

      await expect(
        provider.send(subscription(), { title: 'Titre', body: 'Corps' }),
      ).rejects.toThrow('FcmProvider is not configured');
    });

    it('signe une assertion JWT valide (issuer/subject/audience/scope corrects) pour obtenir le jeton OAuth', async () => {
      const provider = new FcmProvider(configService());
      provider.onModuleInit();
      mockOAuthAndSendResponses(fetchMock, { ok: true });

      await provider.send(subscription(), { title: 'Titre', body: 'Corps' });

      const [tokenUrl, tokenRequestInit] = fetchMock.mock.calls[0] as FetchCall;
      expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
      const assertion = new URLSearchParams(tokenRequestInit.body ?? '').get(
        'assertion',
      );
      expect(assertion).toBeTruthy();

      const publicKey = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(assertion!, publicKey, {
        issuer: 'fcm@foot-tn.iam.gserviceaccount.com',
        subject: 'fcm@foot-tn.iam.gserviceaccount.com',
        audience: 'https://oauth2.googleapis.com/token',
      });
      expect(payload.scope).toBe(
        'https://www.googleapis.com/auth/firebase.messaging',
      );
    });

    it('envoie le message au bon endpoint FCM HTTP v1 avec le jeton et le payload attendus', async () => {
      const provider = new FcmProvider(configService());
      provider.onModuleInit();
      mockOAuthAndSendResponses(fetchMock, { ok: true });

      await provider.send(subscription({ token: 'device-token-42' }), {
        title: 'But !',
        body: 'Le club a marqué',
        data: { matchId: 'm1', minute: 42 },
      });

      const [sendUrl, sendRequestInit] = fetchMock.mock.calls[1] as FetchCall;
      expect(sendUrl).toBe(
        'https://fcm.googleapis.com/v1/projects/foot-tn/messages:send',
      );
      expect(sendRequestInit.headers?.Authorization).toBe(
        'Bearer access-token-xyz',
      );
      const body = JSON.parse(sendRequestInit.body ?? '{}') as {
        message: { token: string; notification: unknown; data: unknown };
      };
      expect(body.message.token).toBe('device-token-42');
      expect(body.message.notification).toEqual({
        title: 'But !',
        body: 'Le club a marqué',
      });
      // FCM exige des valeurs `data` en string uniquement.
      expect(body.message.data).toEqual({ matchId: 'm1', minute: '42' });
    });

    it('réutilise le jeton OAuth en cache pour un deuxième envoi (un seul appel au endpoint token)', async () => {
      const provider = new FcmProvider(configService());
      provider.onModuleInit();
      mockOAuthAndSendResponses(fetchMock, { ok: true });
      fetchMock.mockImplementationOnce(
        () => new Response('{}', { status: 200 }),
      );

      await provider.send(subscription(), { title: 'A', body: 'A' });
      await provider.send(subscription(), { title: 'B', body: 'B' });

      const tokenCalls = fetchMock.mock.calls.filter(
        ([url]) => url === 'https://oauth2.googleapis.com/token',
      );
      expect(tokenCalls).toHaveLength(1);
    });

    it('traduit un token FCM désinstallé (UNREGISTERED) en InvalidPushSubscriptionError', async () => {
      const provider = new FcmProvider(configService());
      provider.onModuleInit();
      mockOAuthAndSendResponses(fetchMock, {
        ok: false,
        status: 404,
        body: {
          error: {
            status: 'UNREGISTERED',
            message: 'Requested entity was not found.',
          },
        },
      });

      await expect(
        provider.send(subscription(), { title: 'Titre', body: 'Corps' }),
      ).rejects.toBeInstanceOf(InvalidPushSubscriptionError);
    });

    it("lève une erreur générique pour un échec FCM qui n'est pas un token invalide", async () => {
      const provider = new FcmProvider(configService());
      provider.onModuleInit();
      mockOAuthAndSendResponses(fetchMock, {
        ok: false,
        status: 500,
        body: { error: { status: 'INTERNAL', message: 'Internal error' } },
      });

      await expect(
        provider.send(subscription(), { title: 'Titre', body: 'Corps' }),
      ).rejects.toThrow('FCM send failed');
    });
  });
});
