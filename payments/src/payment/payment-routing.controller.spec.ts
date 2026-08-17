import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PaymentRoutingController } from './payment-routing.controller';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { KonnectNetworkError } from './providers/konnect/konnect.exceptions';

describe('PaymentRoutingController', () => {
  const routedDto = {
    orderId: 'ORDER-1',
    amount: 25.5,
    currency: 'TND',
    firstName: 'Amin',
    lastName: 'Brahmi',
    email: 'amin@example.test',
    phoneNumber: '20000000',
  };

  let paymentService: {
    findById: jest.Mock;
    initiateKonnectPayment: jest.Mock;
    initiatePaymeePayment: jest.Mock;
    initiateFlouciPayment: jest.Mock;
  };
  let routingPolicyService: {
    getEffectivePolicy: jest.Mock;
    updatePolicy: jest.Mock;
    resolveProvider: jest.Mock;
  };
  let paymentRepository: { findOne: jest.Mock };
  let controller: PaymentRoutingController;

  beforeEach(() => {
    paymentService = {
      findById: jest.fn(),
      initiateKonnectPayment: jest.fn(),
      initiatePaymeePayment: jest.fn(),
      initiateFlouciPayment: jest.fn(),
    };
    routingPolicyService = {
      getEffectivePolicy: jest.fn(),
      updatePolicy: jest.fn(),
      resolveProvider: jest.fn(),
    };
    paymentRepository = { findOne: jest.fn() };
    controller = new PaymentRoutingController(
      paymentService as never,
      routingPolicyService as never,
      paymentRepository as unknown as Repository<Payment>,
      { adminApplications: ['federation-hub'] },
    );
  });

  it('keeps the original provider on an idempotent replay even after policy changes', async () => {
    paymentRepository.findOne.mockResolvedValue({
      id: 'payment-existing',
      provider: PaymentProviderName.FLOUCI,
      providerRef: 'flouci-ref',
      payUrl: 'https://pay.example/flouci-ref',
      callerApplication: 'ticketing',
    });

    await expect(
      controller.init(routedDto, { application: 'ticketing' }, 'idem-1'),
    ).resolves.toEqual({
      paymentId: 'payment-existing',
      provider: PaymentProviderName.FLOUCI,
      providerRef: 'flouci-ref',
      payUrl: 'https://pay.example/flouci-ref',
    });
    expect(routingPolicyService.resolveProvider).not.toHaveBeenCalled();
    expect(paymentService.initiateKonnectPayment).not.toHaveBeenCalled();
    expect(paymentService.initiatePaymeePayment).not.toHaveBeenCalled();
    expect(paymentService.initiateFlouciPayment).not.toHaveBeenCalled();
  });

  it('routes a new payment through the policy-selected provider and returns the durable provider record', async () => {
    paymentRepository.findOne.mockResolvedValue(null);
    routingPolicyService.resolveProvider.mockResolvedValue(
      PaymentProviderName.PAYMEE,
    );
    paymentService.initiatePaymeePayment.mockResolvedValue({
      paymentId: 'payment-1',
      token: 'paymee-token',
      payUrl: 'https://pay.example/paymee-token',
    });
    paymentService.findById.mockResolvedValue({
      id: 'payment-1',
      provider: PaymentProviderName.PAYMEE,
      providerRef: 'paymee-token',
      payUrl: 'https://pay.example/paymee-token',
    });

    await expect(
      controller.init(
        { ...routedDto, preferredProvider: PaymentProviderName.FLOUCI },
        { application: 'marketplace' },
        'idem-2',
      ),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      provider: PaymentProviderName.PAYMEE,
      providerRef: 'paymee-token',
      payUrl: 'https://pay.example/paymee-token',
    });
    expect(routingPolicyService.resolveProvider).toHaveBeenCalledWith(
      'marketplace',
      PaymentProviderName.FLOUCI,
    );
    expect(paymentService.initiatePaymeePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORDER-1',
        firstName: 'Amin',
        email: 'amin@example.test',
      }),
      'marketplace',
      'idem-2',
    );
  });

  it('does not fail over to another provider after an ambiguous PSP network failure', async () => {
    paymentRepository.findOne.mockResolvedValue(null);
    routingPolicyService.resolveProvider.mockResolvedValue(
      PaymentProviderName.KONNECT,
    );
    paymentService.initiateKonnectPayment.mockRejectedValue(
      new KonnectNetworkError(),
    );

    await expect(
      controller.init(routedDto, { application: 'ticketing' }, 'idem-3'),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(paymentService.initiatePaymeePayment).not.toHaveBeenCalled();
    expect(paymentService.initiateFlouciPayment).not.toHaveBeenCalled();
  });

  it('forbids a consumer from administering routing policies', async () => {
    await expect(
      controller.updateRoutingPolicy(
        'ticketing',
        {
          enabledProviders: [PaymentProviderName.KONNECT],
          defaultProvider: PaymentProviderName.KONNECT,
          fallbackProvider: null,
        },
        { application: 'ticketing' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(routingPolicyService.updatePolicy).not.toHaveBeenCalled();
  });

  it('allows a configured administrator to update another consumer policy and records the actor', async () => {
    const dto = {
      enabledProviders: [PaymentProviderName.KONNECT],
      defaultProvider: PaymentProviderName.KONNECT,
      fallbackProvider: null,
    };
    routingPolicyService.updatePolicy.mockResolvedValue({
      consumerApplication: 'ticketing',
      ...dto,
      version: 1,
      source: 'CONSUMER',
    });

    await controller.updateRoutingPolicy('ticketing', dto, {
      application: 'federation-hub',
    });

    expect(routingPolicyService.updatePolicy).toHaveBeenCalledWith(
      'ticketing',
      dto,
      'federation-hub',
    );
  });
});
