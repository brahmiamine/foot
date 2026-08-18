import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RefundApprovalPolicy } from './entities/refund-approval-policy.entity';
import { RefundApprovalMode } from './enums/refund-approval-mode.enum';
import { RefundApprovalPolicyService } from './refund-approval-policy.service';

describe('RefundApprovalPolicyService', () => {
  let repository: jest.Mocked<
    Pick<Repository<RefundApprovalPolicy>, 'findOne' | 'create' | 'save'>
  >;
  let service: RefundApprovalPolicyService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as RefundApprovalPolicy),
      save: jest.fn((value) => Promise.resolve(value as RefundApprovalPolicy)),
    };
    service = new RefundApprovalPolicyService(
      repository as unknown as Repository<RefundApprovalPolicy>,
    );
  });

  it('fails closed to single approval when no policy exists', async () => {
    repository.findOne.mockResolvedValue(null);
    const policy = await service.getEffectivePolicy('ticketing');
    expect(policy).toMatchObject({
      autoMaxAmount: null,
      dualApprovalMinAmount: null,
      makerCheckerEnabled: true,
      version: 0,
      source: 'DEFAULT',
    });
    expect(service.resolveMode(policy, 10)).toBe(
      RefundApprovalMode.SINGLE_APPROVAL,
    );
  });

  it('resolves auto, single and dual bands from thresholds', () => {
    const policy = {
      consumerApplication: 'ticketing',
      autoMaxAmount: '20.000',
      dualApprovalMinAmount: '100.000',
      makerCheckerEnabled: true,
      version: 3,
      source: 'PERSISTED' as const,
    };
    expect(service.resolveMode(policy, 20)).toBe(RefundApprovalMode.AUTO);
    expect(service.resolveMode(policy, 20.001)).toBe(
      RefundApprovalMode.SINGLE_APPROVAL,
    );
    expect(service.resolveMode(policy, 100)).toBe(
      RefundApprovalMode.DUAL_APPROVAL,
    );
  });

  it('rejects overlapping thresholds', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.updatePolicy(
        'ticketing',
        {
          autoMaxAmount: 100,
          dualApprovalMinAmount: 100,
          makerCheckerEnabled: true,
        },
        'federation-hub',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('increments the policy version on update', async () => {
    repository.findOne.mockResolvedValue({
      consumerApplication: 'ticketing',
      autoMaxAmount: '10.000',
      dualApprovalMinAmount: '100.000',
      makerCheckerEnabled: true,
      version: 4,
      updatedByApplication: 'federation-hub',
    } as RefundApprovalPolicy);

    await service.updatePolicy(
      'ticketing',
      {
        autoMaxAmount: 25,
        dualApprovalMinAmount: 250,
        makerCheckerEnabled: true,
      },
      'federation-hub',
    );

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        autoMaxAmount: '25.000',
        dualApprovalMinAmount: '250.000',
        version: 5,
      }),
    );
  });
});
