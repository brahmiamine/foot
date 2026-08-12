import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import type { PaymentPaidEvent } from '../payment/payment.service';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { PaymentWebhookListener } from './payment-webhook.listener';

describe('PaymentWebhookListener', () => {
  function buildEvent(
    overrides: Partial<PaymentPaidEvent> = {},
  ): PaymentPaidEvent {
    return {
      paymentId: 'payment-1',
      orderId: 'ORDER-1',
      provider: PaymentProviderName.KONNECT,
      providerRef: 'ref-123',
      userId: 'user-1',
      callerApplication: 'billetterie',
      amount: '25.500',
      currency: 'TND',
      ...overrides,
    };
  }

  it('dispatches a PAID webhook with a stable, idempotency-friendly eventId', async () => {
    const dispatch = { dispatch: jest.fn() };
    const listener = new PaymentWebhookListener(
      dispatch as unknown as WebhookDispatchService,
    );

    await listener.handlePaymentPaid(buildEvent());

    expect(dispatch.dispatch).toHaveBeenCalledWith('billetterie', {
      eventId: 'payment-paid:payment-1',
      paymentId: 'payment-1',
      orderId: 'ORDER-1',
      status: 'PAID',
      provider: PaymentProviderName.KONNECT,
      providerRef: 'ref-123',
      amount: '25.500',
      currency: 'TND',
      userId: 'user-1',
    });
  });

  it('still delegates to WebhookDispatchService.dispatch when callerApplication is null (which itself is a no-op)', async () => {
    const dispatch = { dispatch: jest.fn() };
    const listener = new PaymentWebhookListener(
      dispatch as unknown as WebhookDispatchService,
    );

    await listener.handlePaymentPaid(buildEvent({ callerApplication: null }));

    expect(dispatch.dispatch).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ paymentId: 'payment-1' }),
    );
  });
});
