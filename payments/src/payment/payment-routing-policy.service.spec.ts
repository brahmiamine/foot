import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UpdatePaymentRoutingPolicyDto } from './dto/update-payment-routing-policy.dto';
import { Payment } from './entities/payment.entity';
import { PaymentRoutingPolicy } from './entities/payment-routing-policy.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentRoutingPolicyService } from './payment-routing-policy.service';

describe('PaymentRoutingPolicyService', () => {
  let repository: jest.Mocked<
    Pick<Repository<PaymentRoutingPolicy>, 'findOne' | 'create' | 'save'>
  >;
  let paymentRepository: jest.Mocked<Pick<Repository<Payment>, 'findOne'>>;
  let service: PaymentRoutingPolicyService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as PaymentRoutingPolicy),
      save: jest.fn((value) => Promise.resolve(value as PaymentRoutingPolicy)),
    };
    paymentRepository = { findOne: jest.fn() };
    service = new PaymentRoutingPolicyService(
      repository as unknown as Repository<PaymentRoutingPolicy>,
      paymentRepository as unknown as Repository<Payment>,
    );
  });

  it('keeps legacy provider access when no consumer policy exists', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getEffectivePolicy('ticketing')).resolves.toEqual({
      consumerApplication: 'ticketing',
      enabledProviders: [
        PaymentProviderName.KONNECT,
        PaymentProviderName.PAYMEE,
        PaymentProviderName.FLOUCI,
      ],
      defaultProvider: PaymentProviderName.KONNECT,
      fallbackProvider: null,
      version: 0,
      source: 'DEFAULT',
    });
  });

  it('routes to the configured fallback when a preferred provider is disabled', async () => {
    repository.findOne.mockResolvedValue({
      consumerApplication: 'ticketing',
      enabledProviders: [
        PaymentProviderName.KONNECT,
        PaymentProviderName.PAYMEE,
      ],
      defaultProvider: PaymentProviderName.KONNECT,
      fallbackProvider: PaymentProviderName.PAYMEE,
      version: 3,
    } as PaymentRoutingPolicy);

    await expect(
      service.resolveProvider('ticketing', PaymentProviderName.FLOUCI),
    ).resolves.toBe(PaymentProviderName.PAYMEE);
  });

  it('blocks a new provider-specific initiation when that provider is disabled', async () => {
    paymentRepository.findOne.mockResolvedValue(null);
    repository.findOne.mockResolvedValue({
      consumerApplication: 'marketplace',
      enabledProviders: [PaymentProviderName.PAYMEE],
      defaultProvider: PaymentProviderName.PAYMEE,
      fallbackProvider: null,
      version: 1,
    } as PaymentRoutingPolicy);

    await expect(
      service.assertProviderEnabledForInitiation(
        'marketplace',
        PaymentProviderName.KONNECT,
        'new-key',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an existing idempotent replay even after that provider is disabled', async () => {
    paymentRepository.findOne.mockResolvedValue({
      id: 'payment-existing',
      callerApplication: 'marketplace',
      idempotencyKey: 'retry-key',
      provider: PaymentProviderName.KONNECT,
    } as Payment);

    await expect(
      service.assertProviderEnabledForInitiation(
        'marketplace',
        PaymentProviderName.KONNECT,
        'retry-key',
      ),
    ).resolves.toBeUndefined();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a policy whose default provider is disabled', async () => {
    const dto: UpdatePaymentRoutingPolicyDto = {
      enabledProviders: [PaymentProviderName.PAYMEE],
      defaultProvider: PaymentProviderName.KONNECT,
      fallbackProvider: null,
    };

    await expect(
      service.updatePolicy('ticketing', dto, 'federation-hub'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('versions updates and records the administrator separately from the consumer', async () => {
    repository.findOne.mockResolvedValue({
      consumerApplication: 'ticketing',
      enabledProviders: [PaymentProviderName.KONNECT],
      defaultProvider: PaymentProviderName.KONNECT,
      fallbackProvider: null,
      version: 4,
      updatedByApplication: 'federation-hub',
    } as PaymentRoutingPolicy);

    const result = await service.updatePolicy(
      'ticketing',
      {
        enabledProviders: [
          PaymentProviderName.KONNECT,
          PaymentProviderName.PAYMEE,
        ],
        defaultProvider: PaymentProviderName.PAYMEE,
        fallbackProvider: PaymentProviderName.KONNECT,
      },
      'platform-governance',
    );

    expect(result.version).toBe(5);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerApplication: 'ticketing',
        version: 5,
        updatedByApplication: 'platform-governance',
      }),
    );
  });
});
