import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceAuthGuard } from './service-auth.guard';

describe('ServiceAuthGuard', () => {
  function contextWithHeaders(headers: Record<string, string>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  function guardWithClients(clients: Record<string, string>) {
    const config = {
      get: (key: string) => (key === 'serviceClients' ? clients : undefined),
    } as unknown as ConfigService;
    return new ServiceAuthGuard(config);
  }

  it('rejects a request without x-api-key', () => {
    const guard = guardWithClients({ ob: 'ob-key' });

    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an unknown api key', () => {
    const guard = guardWithClients({ ob: 'ob-key' });

    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'wrong-key' })),
    ).toThrow(UnauthorizedException);
  });

  it('accepts a known api key and attaches the calling application', () => {
    const guard = guardWithClients({ ob: 'ob-key' });
    const request: { headers: Record<string, string>; service?: unknown } = {
      headers: { 'x-api-key': 'ob-key' },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.service).toEqual({ application: 'ob' });
  });
});
