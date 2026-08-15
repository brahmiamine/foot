import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RefundOperatorGuard } from './refund-operator.guard';

function contextFor(application?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () =>
        application ? { service: { application } } : {},
    }),
  } as unknown as ExecutionContext;
}

describe('RefundOperatorGuard', () => {
  const guard = new RefundOperatorGuard();

  it('allows federation-hub operator calls', () => {
    expect(guard.canActivate(contextFor('federation-hub'))).toBe(true);
  });

  it.each(['ticketing', 'club-hub', 'marketplace', 'seller-portal']) (
    'rejects non-operator service %s',
    (application) => {
      expect(() => guard.canActivate(contextFor(application))).toThrow(
        ForbiddenException,
      );
    },
  );

  it('fails closed when service authentication context is absent', () => {
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});
