import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UpdatePaymentRoutingPolicyDto } from './dto/update-payment-routing-policy.dto';
import { PaymentRoutingPolicy } from './entities/payment-routing-policy.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentRoutingPolicyService } from './payment-routing-policy.service';

describe('PaymentRoutingPolicyService', () => {
  let repository: jest.Mocked<
    Pick<Repository<PaymentRoutingPolicy>, 'findOne' | 'create' | 'save'>
  >;
  let service: PaymentRoutingPolicyService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as PaymentRoutingPolicy),
      save: jest.fn((value) => Promise.resolve(value as PaymentRoutingPolicy)),
    };
    service = new PaymentRoutingPolicyService(
      repository as unknown as Repository<PaymentRoutingPolicy>,
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

  it('blocks a provider-specific route when that provider is disabled', async () => {
    repository.findOne.mockResolvedValue({
      consumerApplication: 'marketplace',
      enabledProviders: [PaymentProviderName.PAYMEE],
      defaultProvider: PaymentProviderName.PAYMEE,
      fallbackProvider: null,
      version: 1,
    } as PaymentRoutingPolicy);

    await expect(
      service.assertProviderEnabled('marketplace', PaymentProviderName.KONNECT),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
