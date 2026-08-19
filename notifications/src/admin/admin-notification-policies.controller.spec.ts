import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminNotificationPoliciesController } from './admin-notification-policies.controller';

function user(
  role: 'ADMIN' | 'SUPERADMIN',
  teamId: string | null,
): AuthenticatedUser {
  return {
    id: `${role.toLowerCase()}-1`,
    email: `${role.toLowerCase()}@example.test`,
    name: role,
    role,
    teamId,
  };
}

describe('AdminNotificationPoliciesController effective policy (GOV-006)', () => {
  it('forces ADMIN resolution to the authenticated club', async () => {
    const resolveExplained = jest
      .fn()
      .mockResolvedValue({ values: {}, sources: {}, appliedRecords: [] });
    const controller = new AdminNotificationPoliciesController({
      resolveExplained,
    } as never);

    await controller.resolveEffective(
      user('ADMIN', 'team-1'),
      'MARKETING',
      'team-other',
      '2026-08-19T10:00:00Z',
    );

    expect(resolveExplained).toHaveBeenCalledWith(
      'team-1',
      'MARKETING',
      new Date('2026-08-19T10:00:00Z'),
    );
  });

  it('lets SUPERADMIN resolve another club explicitly', async () => {
    const resolveExplained = jest
      .fn()
      .mockResolvedValue({ values: {}, sources: {}, appliedRecords: [] });
    const controller = new AdminNotificationPoliciesController({
      resolveExplained,
    } as never);

    await controller.resolveEffective(
      user('SUPERADMIN', null),
      'PAYMENT',
      'team-42',
      undefined,
    );

    expect(resolveExplained).toHaveBeenCalledWith(
      'team-42',
      'PAYMENT',
      expect.any(Date),
    );
  });

  it('rejects an ADMIN without a club scope', async () => {
    const controller = new AdminNotificationPoliciesController({
      resolveExplained: jest.fn(),
    } as never);

    await expect(
      controller.resolveEffective(
        user('ADMIN', null),
        'MARKETING',
        null,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid resolution date', async () => {
    const controller = new AdminNotificationPoliciesController({
      resolveExplained: jest.fn(),
    } as never);

    await expect(
      controller.resolveEffective(
        user('SUPERADMIN', null),
        'MARKETING',
        null,
        'not-a-date',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
