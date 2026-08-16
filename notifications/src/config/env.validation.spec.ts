import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  function validEnv(
    overrides: Record<string, string> = {},
  ): Record<string, string> {
    return {
      SSO_URL: 'https://sso.example.com',
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

  it('rejects an environment missing SSO_URL', () => {
    const env = validEnv();
    delete (env as Record<string, string | undefined>).SSO_URL;
    expect(() => validateEnv(env)).toThrow(/SSO_URL/);
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
      validateEnv(
        validEnv({
          SERVICE_API_KEYS_PREVIOUS: '{"club-hub":"key-old"}',
        }),
      ),
    ).toThrow(/must be configured together/);
  });

  it('rejects an expiry without a previous key', () => {
    expect(() =>
      validateEnv(
        validEnv({
          SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: '2026-08-20T00:00:00.000Z',
        }),
      ),
    ).toThrow(/must be configured together/);
  });

  it('rejects an invalid EMAIL_PROVIDER', () => {
    expect(() =>
      validateEnv(validEnv({ EMAIL_PROVIDER: 'mailgun' })),
    ).toThrow();
  });
});
