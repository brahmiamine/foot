import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AllowedApplicationsGuard } from './allowed-applications.guard';

describe('AllowedApplicationsGuard', () => {
  function contextWithService(
    application: string | undefined,
    metadata: string[] | undefined,
  ): ExecutionContext {
    const request = { service: application ? { application } : undefined };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}) as unknown,
      getClass: () => ({}) as unknown,
      __metadata: metadata,
    } as unknown as ExecutionContext;
  }

  function guardWithMetadata(metadata: string[] | undefined) {
    const reflector = {
      getAllAndOverride: () => metadata,
    } as unknown as Reflector;
    return new AllowedApplicationsGuard(reflector);
  }

  it('lets any authenticated application through when no @AllowedApplications is declared', () => {
    const guard = guardWithMetadata(undefined);

    expect(guard.canActivate(contextWithService('sellerPortal', undefined))).toBe(true);
  });

  it('allows an application present in the declared list', () => {
    const guard = guardWithMetadata(['teamManager', 'superadmin']);

    expect(guard.canActivate(contextWithService('teamManager', undefined))).toBe(true);
  });

  it('rejects an application absent from the declared list (e.g. sellerPortal on a moderation route)', () => {
    const guard = guardWithMetadata(['teamManager', 'superadmin']);

    expect(() => guard.canActivate(contextWithService('sellerPortal', undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when request.service is missing (ServiceAuthGuard did not run first)', () => {
    const guard = guardWithMetadata(['teamManager']);

    expect(() => guard.canActivate(contextWithService(undefined, undefined))).toThrow(
      ForbiddenException,
    );
  });
});
