import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import type { PaymentPaidEvent } from '../payment/payment.service';
import { NotificationClientService } from './notification-client.service';
import { PaymentNotificationsListener } from './payment-notifications.listener';

describe('PaymentNotificationsListener', () => {
  function buildEvent(
    overrides: Partial<PaymentPaidEvent> = {},
  ): PaymentPaidEvent {
    return {
      paymentId: 'payment-1',
      orderId: 'ORDER-1',
      provider: PaymentProviderName.KONNECT,
      providerRef: 'ref-123',
      userId: null,
      callerApplication: 'billetterie',
      amount: '25.500',
      currency: 'TND',
      ...overrides,
    };
  }

  it('does nothing when the payment has no userId', async () => {
    const notificationClient = { notify: jest.fn() };
    const listener = new PaymentNotificationsListener(
      notificationClient as unknown as NotificationClientService,
    );

    await listener.handlePaymentPaid(buildEvent({ userId: null }));

    expect(notificationClient.notify).not.toHaveBeenCalled();
  });

  it('notifies the payer via notification-api when userId is present', async () => {
    const notificationClient = { notify: jest.fn() };
    const listener = new PaymentNotificationsListener(
      notificationClient as unknown as NotificationClientService,
    );

    await listener.handlePaymentPaid(buildEvent({ userId: 'user-1' }));

    expect(notificationClient.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'payment-succeeded:payment-1',
        type: 'PAYMENT_SUCCEEDED',
        userId: 'user-1',
      }),
    );
  });
});
