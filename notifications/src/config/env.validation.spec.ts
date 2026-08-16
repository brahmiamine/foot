import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  function validEnv(overrides: Record<string, string> = {}): Record<string, string> {
    return {
      SSO_JWT_SECRET: 'shared-secret',
      SERVICE_API_KEYS: '{"club-hub":"key-1"}',
      DB_HOST: 'localhost',
      DB_USERNAME: 'notification_api',
      DB_DATABASE: 'notification_api',
      ...overrides,
    };
  }

  it('accepts a minimal valid environment', () => {
    expect(() => validateEnv(validEnv())).not.toThrow();
  });

  it('rejects an environment missing SSO_JWT_SECRET', () => {
    const env = validEnv();
    delete (env as Record<string, string | undefined>).SSO_JWT_SECRET;
    expect(() => validateEnv(env)).toThrow(/SSO_JWT_SECRET/);
  });

  it('rejects an environment missing SERVICE_API_KEYS', () => {
    const env = validEnv();
    delete (env as Record<string, string | undefined>).SERVICE_API_KEYS;
    expect(() => validateEnv(env)).toThrow(/SERVICE_API_KEYS/);
  });

  it('accepts a previous key with a valid ISO expiry', () => {
    expect(() =>
      validateEnv(
        validEnv({
          SERVICE_API_KEYS_PREVIOUS: '{"club-hub":"key-old"}',
          SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: '2026-08-20T00:00:00.000Z',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects a previous key without an expiry', () => {
    expect(() =>
      validateEnv(validEnv({ SERVICE_API_KEYS_PREVIOUS: '{"club-hub":"key-old"}' })),
    ).toThrow(/must be configured together/);
  });

  it('rejects an expiry without a previous key', () => {
    expect(() =>
      validateEnv(validEnv({ SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: '2026-08-20T00:00:00.000Z' })),
    ).toThrow(/must be configured together/);
  });

  it('rejects an invalid SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT', () => {
    expect(() =>
      validateEnv(
        validEnv({
          SERVICE_API_KEYS_PREVIOUS: '{"club-hub":"key-old"}',
          SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: 'not-a-date',
        }),
      ),
    ).toThrow(/SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT/);
  });

  it('rejects an invalid EMAIL_PROVIDER', () => {
    expect(() => validateEnv(validEnv({ EMAIL_PROVIDER: 'mailgun' }))).toThrow();
  });

  it('accepts a fully populated environment', () => {
    expect(() =>
      validateEnv(
        validEnv({
          DIRECTORY_DB_HOST: 'localhost',
          DIRECTORY_DB_DATABASE: 'foot',
          REDIS_HOST: 'localhost',
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 'resend-key',
          WEB_PUSH_PUBLIC_KEY: 'pub',
          WEB_PUSH_PRIVATE_KEY: 'priv',
        }),
      ),
    ).not.toThrow();
  });
});
