import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RefundManualReviewPolicy } from './entities/refund-manual-review-policy.entity';
import { RefundManualReviewPolicyService } from './refund-manual-review-policy.service';

describe('RefundManualReviewPolicyService', () => {
  function build() {
    let stored: RefundManualReviewPolicy | null = null;
    const repository = {
      findOne: jest.fn(() => Promise.resolve(stored)),
      create: jest.fn((value: Partial<RefundManualReviewPolicy>) => value),
      save: jest.fn((value: RefundManualReviewPolicy) => {
        stored = value;
        return Promise.resolve(value);
      }),
    } as unknown as Repository<RefundManualReviewPolicy>;
    return { service: new RefundManualReviewPolicyService(repository), repository };
  }

  it('uses a fail-safe default SLA when no consumer policy exists', async () => {
    const { service } = build();
    await expect(service.getEffectivePolicy('ticketing')).resolves.toEqual({
      consumerApplication: 'ticketing',
      slaMinutes: 1440,
      reminderBeforeDueMinutes: 240,
      escalationAfterDueMinutes: 60,
      version: 0,
      source: 'DEFAULT',
    });
  });

  it('versions persisted policies and records the trusted operator', async () => {
    const { service } = build();
    const first = await service.updatePolicy(
      'ticketing',
      {
        slaMinutes: 720,
        reminderBeforeDueMinutes: 120,
        escalationAfterDueMinutes: 30,
      },
      'federation-hub',
      'finance-1',
    );
    expect(first).toMatchObject({
      consumerApplication: 'ticketing',
      version: 1,
      updatedByApplication: 'federation-hub',
      updatedByUser: 'finance-1',
    });

    const second = await service.updatePolicy(
      'ticketing',
      {
        slaMinutes: 600,
        reminderBeforeDueMinutes: 60,
        escalationAfterDueMinutes: 15,
      },
      'federation-hub',
      'finance-2',
    );
    expect(second.version).toBe(2);
    expect(second.updatedByUser).toBe('finance-2');
  });

  it('rejects a reminder that is not strictly before the SLA deadline', async () => {
    const { service } = build();
    await expect(
      service.updatePolicy(
        'ticketing',
        {
          slaMinutes: 60,
          reminderBeforeDueMinutes: 60,
          escalationAfterDueMinutes: 10,
        },
        'federation-hub',
        'finance-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
