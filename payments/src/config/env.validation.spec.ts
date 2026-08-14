import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  function validEnv(
    overrides: Record<string, string> = {},
  ): Record<string, string> {
    return {
      KONNECT_BASE_URL: 'https://api.sandbox.konnect.network/api/v2',
      KONNECT_API_KEY: 'konnect-key',
      KONNECT_WALLET_ID: 'wallet-123',
      KONNECT_WEBHOOK_URL: 'https://api.example.com/payments/konnect/webhook',
      PAYMEE_BASE_URL: 'https://sandbox.paymee.tn/api/v2',
      PAYMEE_API_KEY: 'paymee-key',
      PAYMEE_WEBHOOK_URL:
        'https://api.example.com/payments/providers/paymee/webhook',
      PAYMEE_RETURN_URL: 'https://example.com/payment/return',
      PAYMEE_CANCEL_URL: 'https://example.com/payment/cancel',
      FLOUCI_BASE_URL: 'https://developers.flouci.com',
      FLOUCI_PUBLIC_KEY: 'flouci-public-key',
      FLOUCI_PRIVATE_KEY: 'flouci-private-key',
      FLOUCI_WEBHOOK_URL:
        'https://api.example.com/payments/providers/flouci/webhook',
      FLOUCI_SUCCESS_URL: 'https://example.com/payment/success',
      FLOUCI_FAIL_URL: 'https://example.com/payment/fail',
      SERVICE_API_KEYS: '{"club-ob":"ob-key"}',
      DB_HOST: 'localhost',
      DB_USERNAME: 'payment_api',
      DB_DATABASE: 'payment_api',
      ...overrides,
    };
  }

  it('accepts a fully populated, valid environment', () => {
    expect(() => validateEnv(validEnv())).not.toThrow();
  });

  it('rejects an environment missing FLOUCI_PUBLIC_KEY (absent credentials)', () => {
    const env = validEnv();
    delete (env as Record<string, string | undefined>).FLOUCI_PUBLIC_KEY;

    expect(() => validateEnv(env)).toThrow(/FLOUCI_PUBLIC_KEY/);
  });

  it('rejects an environment missing FLOUCI_PRIVATE_KEY (absent credentials)', () => {
    const env = validEnv();
    delete (env as Record<string, string | undefined>).FLOUCI_PRIVATE_KEY;

    expect(() => validateEnv(env)).toThrow(/FLOUCI_PRIVATE_KEY/);
  });

  it('rejects an environment with an invalid FLOUCI_BASE_URL', () => {
    const env = validEnv({ FLOUCI_BASE_URL: 'not a url' });

    expect(() => validateEnv(env)).toThrow(/FLOUCI_BASE_URL/);
  });

  it('rejects an environment missing SERVICE_API_KEYS', () => {
    const env = validEnv();
    delete (env as Record<string, string | undefined>).SERVICE_API_KEYS;

    expect(() => validateEnv(env)).toThrow(/SERVICE_API_KEYS/);
  });

  // TASK-P0-003 : rotation sans interruption — champs optionnels.
  it('accepts an environment with SERVICE_API_KEYS_PREVIOUS and a valid ISO expiry', () => {
    const env = validEnv({
      SERVICE_API_KEYS_PREVIOUS: '{"club-ob":"ob-old-key"}',
      SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: '2026-08-20T00:00:00.000Z',
    });

    expect(() => validateEnv(env)).not.toThrow();
  });

  it('rejects an invalid SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT', () => {
    const env = validEnv({
      SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT: 'not-a-date',
    });

    expect(() => validateEnv(env)).toThrow(
      /SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT/,
    );
  });
});
