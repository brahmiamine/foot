import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { SsoJwtService } from './sso-jwt.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jest.mocked(jwtVerify);
const originalFetch = global.fetch;

describe('SsoJwtService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ active: true }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function buildService() {
    const config = {
      get: (key: string) => {
        if (key === 'SSO_URL') return 'https://sso.test';
        if (key === 'SSO_JWT_ISSUER') return 'foot-sso';
        return undefined;
      },
    } as unknown as ConfigService;
    return new SsoJwtService(config);
  }

  it('enforces RS256 and the platform audience when verifying sessions', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user-1',
        email: 'user@example.com',
        role: 'ADMIN',
        aud: 'foot-platform',
      },
      protectedHeader: { alg: 'RS256', kid: 'kid-1' },
    } as never);

    const result = await buildService().verify('token');

    expect(result?.id).toBe('user-1');
    expect(createRemoteJWKSet).toHaveBeenCalled();
    expect(mockedJwtVerify).toHaveBeenCalledWith(
      'token',
      expect.anything(),
      expect.objectContaining({
        issuer: 'foot-sso',
        audience: 'foot-platform',
        algorithms: ['RS256'],
      }),
    );
  });

  it('returns null when strict JWT verification fails', async () => {
    mockedJwtVerify.mockRejectedValue(
      new Error('invalid audience or algorithm'),
    );
    expect(await buildService().verify('token')).toBeNull();
  });
});
