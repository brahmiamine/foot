import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  function validEnv(overrides: Record<string, string> = {}): Record<string, string> {
    return {
      SELLER_JWT_SECRET: 'seller-secret',
      SERVICE_API_KEYS: '{"club-hub":"key-1"}',
      DB_HOST: 'localhost',
      DB_USERNAME: 'marketplace',
      DB_DATABASE: 'marketplace',
      ...overrides,
    };
  }

  it('accepts a minimal valid environment', () => {
    expect(() => validateEnv(validEnv())).not.toThrow();
  });

  it('accepts a previous key with an expiry', () => {
    expect(() =>
      validateEnv(
        validEnv({
          SERVICE_API_KEYS_PREVIOUS: '{"club-hub":"old-key"}',
          SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: '2026-08-20T00:00:00.000Z',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects a previous key without an expiry', () => {
    expect(() =>
      validateEnv(validEnv({ SERVICE_API_KEYS_PREVIOUS: '{"club-hub":"old-key"}' })),
    ).toThrow(/must be configured together/);
  });

  it('rejects an expiry without a previous key', () => {
    expect(() =>
      validateEnv(validEnv({ SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: '2026-08-20T00:00:00.000Z' })),
    ).toThrow(/must be configured together/);
  });
});
