import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceAuthGuard } from './service-auth.guard';
import type { ServiceClientsConfig } from '../../config/service-clients.config';

describe('ServiceAuthGuard', () => {
  function contextWithHeaders(headers: Record<string, string>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers, method: 'GET', path: '/payments/1' }),
      }),
    } as unknown as ExecutionContext;
  }

  function guardWithClients(config: Partial<ServiceClientsConfig>) {
    const full: ServiceClientsConfig = {
      current: config.current ?? {},
      previous: config.previous ?? {},
      previousExpiresAt: config.previousExpiresAt,
    };
    const configService = {
      get: (key: string) => (key === 'serviceClients' ? full : undefined),
    } as unknown as ConfigService;
    return new ServiceAuthGuard(configService);
  }

  it('rejects a request without x-api-key', () => {
    const guard = guardWithClients({ current: { 'club-ob': 'ob-key' } });
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
  });

  it('rejects an unknown api key', () => {
    const guard = guardWithClients({ current: { 'club-ob': 'ob-key' } });
    expect(() => guard.canActivate(contextWithHeaders({ 'x-api-key': 'wrong-key' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts a known api key and attaches the calling application', () => {
    const guard = guardWithClients({ current: { 'club-ob': 'ob-key' } });
    const request: {
      headers: Record<string, string>;
      method: string;
      path: string;
      service?: unknown;
    } = {
      headers: { 'x-api-key': 'ob-key' },
      method: 'GET',
      path: '/payments/1',
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.service).toEqual({ application: 'club-ob' });
  });

  it('accepts the previous key while still within the grace period', () => {
    const guard = guardWithClients({
      current: { 'club-ob': 'ob-key-new' },
      previous: { 'club-ob': 'ob-key-old' },
      previousExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(guard.canActivate(contextWithHeaders({ 'x-api-key': 'ob-key-old' }))).toBe(true);
  });

  it('rejects the previous key once the grace period has expired', () => {
    const guard = guardWithClients({
      current: { 'club-ob': 'ob-key-new' },
      previous: { 'club-ob': 'ob-key-old' },
      previousExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(() => guard.canActivate(contextWithHeaders({ 'x-api-key': 'ob-key-old' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects the previous key when no expiry is configured', () => {
    const guard = guardWithClients({
      current: { 'club-ob': 'ob-key-new' },
      previous: { 'club-ob': 'ob-key-old' },
    });
    expect(() => guard.canActivate(contextWithHeaders({ 'x-api-key': 'ob-key-old' }))).toThrow(
      UnauthorizedException,
    );
  });
});
