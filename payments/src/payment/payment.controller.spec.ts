import { NotFoundException } from '@nestjs/common';
import { PaymentController } from './payment.controller';

describe('PaymentController service ownership', () => {
  it('does not disclose another application payment', async () => {
    const paymentService = {
      findById: jest.fn().mockResolvedValue({
        id: 'payment-1',
        callerApplication: 'marketplace',
      }),
    };
    const controller = new PaymentController(paymentService as never);

    await expect(
      controller.getById('11111111-1111-4111-8111-111111111111', {
        application: 'ticketing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the payment to its owning application', async () => {
    const payment = { id: 'payment-1', callerApplication: 'ticketing' };
    const paymentService = { findById: jest.fn().mockResolvedValue(payment) };
    const controller = new PaymentController(paymentService as never);

    await expect(
      controller.getById('11111111-1111-4111-8111-111111111111', {
        application: 'ticketing',
      }),
    ).resolves.toBe(payment);
  });
});
